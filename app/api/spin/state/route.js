export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireUser } from '@/app/lib/auth';

const STATE_ID = 'global';
const tierFromWager = (w) => (w === 50 ? 'T50' : w === 100 ? 'T100' : w === 200 ? 'T200' : 'T500');

function coinWeightsFor(w) {
  if (w === 50)  return { w75: 2,   w100: 3 };          // 50-spin: 75 (2x harder), 100 (3x harder) x2
  if (w === 100) return { w50: 0.5, w200: 3, w150: 2 }; // 100-spin: 50 (2x easier), 200 (3x harder), 150 (2x harder)
  if (w === 200) return { w100: 0.5, w500: 5, w300: 2 }; // 200-spin: 100 (2x easier), 500 (5x harder) x2, 300 (2x harder)
  return {};
}

function buildSegments(items, wager) {
  const segs = items.map(i => ({
    type: 'item',
    id: i.id,
    name: i.name,
    imageUrl: i.imageUrl || null,
    weight: 1,
  }));

  const W = coinWeightsFor(wager);

  if (wager === 50) {
    segs.push({ type: 'coins', amount: 75,  weight: W.w75  ?? 2 });
    segs.push({ type: 'coins', amount: 100, weight: W.w100 ?? 3 });
    segs.push({ type: 'coins', amount: 100, weight: W.w100 ?? 3 });
    segs.push({ type: 'again', weight: 1 });
  }
  if (wager === 100) {
    segs.push({ type: 'coins', amount: 50,  weight: W.w50  ?? 0.5 });
    segs.push({ type: 'coins', amount: 200, weight: W.w200 ?? 3 });
    segs.push({ type: 'coins', amount: 150, weight: W.w150 ?? 2 });
    segs.push({ type: 'again', weight: 1 });
  }
  if (wager === 200) {
    segs.push({ type: 'coins', amount: 100, weight: W.w100 ?? 0.5 });
    segs.push({ type: 'coins', amount: 500, weight: W.w500 ?? 5 });
    segs.push({ type: 'coins', amount: 500, weight: W.w500 ?? 5 });
    segs.push({ type: 'coins', amount: 300, weight: W.w300 ?? 2 });
    segs.push({ type: 'again', weight: 1 });
  }

  return segs.map(s => ({ ...s, weight: Math.max(0.0001, Number(s.weight || 1)) }));
}

function pickIndexWeighted(segments) {
  const total = segments.reduce((a, s) => a + s.weight, 0);
  let r = Math.random() * total;
  for (let i = 0; i < segments.length; i++) {
    if (r < segments[i].weight) return i;
    r -= segments[i].weight;
  }
  return segments.length - 1;
}

export async function POST(req) {
  // auth
  let me;
  try { me = requireUser(); } catch { return NextResponse.json({ error: 'unauth' }, { status: 401 }); }

  const body = await req.json().catch(() => ({}));
  const wager = [50, 100, 200].includes(Number(body.wager)) ? Number(body.wager) : 50;
  const tier = tierFromWager(wager);

  // lock (respect expiry/grace)
  const existing = await prisma.spinState.findUnique({ where: { id: STATE_ID } });
  if (existing && existing.status === 'SPINNING' && existing.userId && existing.spinStartAt && existing.durationMs) {
    const started = new Date(existing.spinStartAt).getTime();
    const locked = Date.now() <= started + Number(existing.durationMs) + 1500;
    if (locked && existing.userId !== me.sub) {
      return NextResponse.json({ error: 'busy' }, { status: 409 });
    }
  }

  // user & wallet
  const user = await prisma.user.findUnique({ where: { id: me.sub } });
  const display = (user && (user.displayName || user.username)) || 'Player';
  const wallet = await prisma.wallet.findUnique({ where: { userId: me.sub } });
  const bal = Number(wallet?.balance ?? 0);
  if (bal < wager) return NextResponse.json({ error: 'not enough coins' }, { status: 400 });

  // build wheel
  const items = await prisma.item.findMany({
    where: { isActive: true, tier },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  const segments = buildSegments(items, wager);
  if (!segments.length) return NextResponse.json({ error: 'no segments' }, { status: 400 });

  const resultIndex = pickIndexWeighted(segments);
  const now = new Date();
  const durationMs = 10000;

  // deduct + set state (NO credit yet)
  await prisma.$transaction([
    prisma.wallet.update({ where: { userId: me.sub }, data: { balance: bal - wager } }),
    prisma.spinState.upsert({
      where: { id: STATE_ID },
      create: {
        id: STATE_ID,
        status: 'SPINNING',
        userId: me.sub,
        username: display,
        wager,
        segments,
        resultIndex,
        spinStartAt: now,
        durationMs,
      },
      update: {
        status: 'SPINNING',
        userId: me.sub,
        username: display,
        wager,
        segments,
        resultIndex,
        spinStartAt: now,
        durationMs,
      },
    }),
  ]);

  const newBal = (await prisma.wallet.findUnique({ where: { userId: me.sub } }))?.balance || 0;

  return NextResponse.json(
    {
      status: 'SPINNING',
      userId: me.sub,
      username: display,
      wager,
      segments,
      resultIndex,
      spinStartAt: now.toISOString(),
      durationMs,
      balance: newBal,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
