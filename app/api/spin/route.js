export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getUser } from '@/app/lib/auth';

const TIER = { 50: 'T50', 100: 'T100', 200: 'T200', 500: 'T500' };

// weight constants
const W = { NORMAL: 10, HARDER_2X: 5, HARDER_3X: 3, HARDER_5X: 2 };

// weighted random pick
function pickWeightedIndex(weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let t = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    t -= weights[i];
    if (t <= 0) return i;
  }
  return weights.length - 1;
}

// small helper to get N random distinct
function pickRandomDistinct(arr, n) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, Math.min(n, a.length));
}

async function buildWeightedSegments(wager) {
  const items = await prisma.item.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
    take: 1000,
  });

  const t50 = items.filter(i => i.tier === 'T50');
  const t100 = items.filter(i => i.tier === 'T100');
  const t200 = items.filter(i => i.tier === 'T200');
  const t500 = items.filter(i => i.tier === 'T500');

  const segs = [];
  const weights = [];

  const pushItem = (it, w) => {
    segs.push({ type: 'item', id: it.id, name: it.name, imageUrl: it.imageUrl ?? null });
    weights.push(w);
  };
  const pushCoins = (amount, w) => { segs.push({ type: 'coins', amount }); weights.push(w); };
  const pushRespin = (w) => { segs.push({ type: 'respin', label: 'Another spin' }); weights.push(w); };

  if (wager === 50) {
    t50.forEach(it => pushItem(it, W.NORMAL));
    pickRandomDistinct(t100, 2).forEach(it => pushItem(it, W.HARDER_2X));
    pushCoins(75, W.HARDER_2X);
    pushRespin(W.NORMAL);
  } else if (wager === 100) {
    t100.forEach(it => pushItem(it, W.NORMAL));
    pickRandomDistinct(t200, 2).forEach(it => pushItem(it, W.HARDER_3X));
    pickRandomDistinct(t50, 2).forEach(it => pushItem(it, W.HARDER_2X));
    pushCoins(150, W.HARDER_2X);
    pushRespin(W.NORMAL);
  } else if (wager === 200) {
    t200.forEach(it => pushItem(it, W.NORMAL));
    pickRandomDistinct(t500, 2).forEach(it => pushItem(it, W.HARDER_3X));
    pickRandomDistinct(t100, 2).forEach(it => pushItem(it, W.HARDER_2X));
    pushCoins(300, W.HARDER_3X);
    pushRespin(W.NORMAL);
  } else {
    pushRespin(W.NORMAL);
  }

  while (segs.length < 6) pushRespin(W.NORMAL);
  return { segs, weights };
}

export async function POST(req) {
  try {
    const me = await getUser();
    if (!me) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const { wager } = await req.json().catch(() => ({}));
    const w = Number(wager);
    if (![50, 100, 200].includes(w)) {
      return NextResponse.json({ error: 'invalid_wager' }, { status: 400 });
    }

    let s = await prisma.spinState.findUnique({ where: { id: 'global' } });
    if (!s) s = await prisma.spinState.create({ data: { id: 'global', status: 'IDLE' } });

    if (s.status === 'SPINNING' && s.userId && s.userId !== me.sub) {
      return NextResponse.json({ error: 'busy', username: s.username || 'other' }, { status: 409 });
    }

    const wallet = await prisma.wallet.upsert({
      where: { userId: me.sub },
      update: {},
      create: { userId: me.sub, balance: 0 },
    });
    if ((wallet.balance ?? 0) < w) {
      return NextResponse.json({ error: 'not_enough_coins', balance: wallet.balance ?? 0 }, { status: 400 });
    }

    const { segs, weights } = await buildWeightedSegments(w);
    if (!segs.length) return NextResponse.json({ error: 'no_segments' }, { status: 400 });

    const resultIndex = pickWeightedIndex(weights);

    await prisma.wallet.update({
      where: { userId: me.sub },
      data: { balance: { decrement: w } },
    });

    const updated = await prisma.spinState.update({
      where: { id: 'global' },
      data: {
        status: 'SPINNING',
        userId: me.sub,
        username: me.displayName || me.username || 'player',
        wager: w,
        segments: segs,
        resultIndex,
        spinStartAt: new Date(),
        durationMs: 10000,
      },
    });

    return NextResponse.json(updated, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('spin POST error', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
