export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireUser } from '@/app/lib/auth';

// ---- helpers ----
const priceOfTier = (tier) =>
  tier === 'T50' ? 50 : tier === 'T100' ? 100 : tier === 'T200' ? 200 : 500;

const tierName = (w) => (w === 50 ? 'T50' : w === 100 ? 'T100' : w === 200 ? 'T200' : 'T500');

function coinWeightsFor(wager) {
  // baseline “rarity multipliers”
  if (wager === 50) {
    return { bonus75Weight: 2, bonus100Weight: 3 };
  }
  if (wager === 100) {
    return { bonus50Weight: 0.5, bonus150Weight: 2, bonus200Weight: 3 };
  }
  if (wager === 200) {
    return { bonus100Weight: 0.5, bonus300Weight: 2, bonus500Weight: 5 };
  }
  return {};
}

function buildSegments(baseItems, wager) {
  const segs = [];

  // Base items for this tier
  for (const it of baseItems) {
    segs.push({
      type: 'item',
      id: it.id,
      name: it.name,
      imageUrl: it.imageUrl || null,
    });
  }

  // Add specials / coins according to rules
  const w = coinWeightsFor(wager);

  if (wager === 50) {
    segs.push({ type: 'coins', amount: 75, weight: w.bonus75Weight || 2 });
    segs.push({ type: 'coins', amount: 100, weight: w.bonus100Weight || 3 });
    segs.push({ type: 'coins', amount: 100, weight: w.bonus100Weight || 3 });
    segs.push({ type: 'again' });
  }
  if (wager === 100) {
    segs.push({ type: 'coins', amount: 50, weight: w.bonus50Weight || 0.5 });
    segs.push({ type: 'coins', amount: 200, weight: w.bonus200Weight || 3 });
    segs.push({ type: 'coins', amount: 150, weight: w.bonus150Weight || 2 });
    segs.push({ type: 'again' });
  }
  if (wager === 200) {
    segs.push({ type: 'coins', amount: 100, weight: w.bonus100Weight || 0.5 });
    segs.push({ type: 'coins', amount: 500, weight: w.bonus500Weight || 5 });
    segs.push({ type: 'coins', amount: 500, weight: w.bonus500Weight || 5 });
    segs.push({ type: 'coins', amount: 300, weight: w.bonus300Weight || 2 });
    segs.push({ type: 'again' });
  }

  // light shuffle for variety
  for (let i = segs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [segs[i], segs[j]] = [segs[j], segs[i]];
  }

  return segs;
}

function pickIndexWeighted(segments) {
  // If a segment has weight, use inverse weight as probability mass; else mass = 1
  const masses = segments.map((s) => {
    if (s.type === 'coins' && s.weight) return 1 / Number(s.weight);
    if (s.type === 'again') return 0.7; // not too frequent
    return 1;
  });
  const total = masses.reduce((a, b) => a + b, 0);
  const r = Math.random() * total;
  let acc = 0;
  for (let i = 0; i < masses.length; i++) {
    acc += masses[i];
    if (r <= acc) return i;
  }
  return segments.length - 1;
}

export async function POST(req) {
  const me = requireUser();

  const body = await req.json().catch(() => ({}));
  const wager = Number(body.wager || 50);
  if (![50, 100, 200].includes(wager)) {
    return NextResponse.json({ error: 'invalid wager' }, { status: 400 });
  }
  const tier = tierName(wager);

  // do everything in a single transaction to avoid races
  try {
    const result = await prisma.$transaction(async (tx) => {
      // check global lock
      const lock = await tx.spinState.findUnique({ where: { id: 'global' } });
      if (lock && lock.status === 'SPINNING' && lock.userId && lock.userId !== me.sub) {
        return { error: 'busy', status: 409 };
      }

      // ensure wallet
      const wallet = await tx.wallet.upsert({
        where: { userId: me.sub },
        update: {},
        create: { userId: me.sub, balance: 0 },
      });

      if ((wallet.balance || 0) < wager) {
        return { error: 'not enough coins', status: 400 };
      }

      // fetch active items for this tier
      const items = await tx.item.findMany({
        where: { isActive: true, tier },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      const segments = buildSegments(items, wager);
      if (!segments.length) {
        return { error: 'no segments', status: 400 };
      }

      // decide winner now; client just animates to this index
      const resultIndex = pickIndexWeighted(segments);

      // charge the wager now
      await tx.wallet.update({
        where: { userId: me.sub },
        data: { balance: { decrement: wager } },
      });

      // set spinning state (5s animation)
      const durationMs = 5000;
      const now = new Date();

      const user = await tx.user.findUnique({
        where: { id: me.sub },
        select: { username: true, displayName: true },
      });

      await tx.spinState.upsert({
        where: { id: 'global' },
        update: {
          status: 'SPINNING',
          userId: me.sub,
          username: user?.displayName || user?.username || 'Player',
          wager,
          segments,
          resultIndex,
          spinStartAt: now,
          durationMs,
          popup: null,
        },
        create: {
          id: 'global',
          status: 'SPINNING',
          userId: me.sub,
          username: user?.displayName || user?.username || 'Player',
          wager,
          segments,
          resultIndex,
          spinStartAt: now,
          durationMs,
          popup: null,
        },
      });

      const newBalance =
        (
          await tx.wallet.findUnique({
            where: { userId: me.sub },
            select: { balance: true },
          })
        )?.balance || 0;

      return {
        status: 200,
        payload: {
          status: 'SPINNING',
          userId: me.sub,
          username: user?.displayName || user?.username || 'Player',
          wager,
          segments,
          resultIndex,
          spinStartAt: now.toISOString(),
          durationMs,
          balance: newBalance,
          popup: null,
        },
      };
    });

    if (result?.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.payload, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'spin failed' }, { status: 500 });
  }
}
