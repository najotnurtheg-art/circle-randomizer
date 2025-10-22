export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getUser } from '@/app/lib/auth';

const TIER = { 50: 'T50', 100: 'T100', 200: 'T200', 500: 'T500' };

// weight scale
const W = {
  NORMAL: 10,
  HARDER_2X: 5,
  HARDER_3X: 3,
  HARDER_5X: 2,
};

function pickWeightedIndex(weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return 0;
  let t = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    t -= weights[i];
    if (t <= 0) return i;
  }
  return weights.length - 1;
}

function pickRandomDistinct(arr, count) {
  const a = [...arr];
  // Fisher–Yates shuffle (partial)
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, Math.min(count, a.length));
}

async function buildWeightedSpec(wager) {
  // Pull all active items once
  const items = await prisma.item.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
    take: 1000,
  });

  const t50 = items.filter(i => i.tier === 'T50');
  const t100 = items.filter(i => i.tier === 'T100');
  const t200 = items.filter(i => i.tier === 'T200');
  const t500 = items.filter(i => i.tier === 'T500');

  // base structures
  const baseSegs = [];   // what we send to client (unique slices, no duplication)
  const weights  = [];   // server-side weights aligned by index in baseSegs

  const pushItem = (it, weight) => {
    baseSegs.push({ type: 'item', id: it.id, name: it.name, imageUrl: it.imageUrl ?? null });
    weights.push(weight);
  };
  const pushCoins = (amount, weight) => {
    baseSegs.push({ type: 'coins', amount });
    weights.push(weight);
  };
  const pushRespin = (weight) => {
    baseSegs.push({ type: 'respin', label: 'Another spin' });
    weights.push(weight);
  };

  if (wager === 50) {
    // all items T50 normal
    t50.forEach(it => pushItem(it, W.NORMAL));
    // + 2 items T100 as 3x harder
    pickRandomDistinct(t100, 2).forEach(it => pushItem(it, W.HARDER_3X));
    // +75 coins as 2x harder
    pushCoins(75, W.HARDER_2X);
    // another spin normal
    pushRespin(W.NORMAL);
  } else if (wager === 100) {
    // all items T100 normal
    t100.forEach(it => pushItem(it, W.NORMAL));
    // + 2 items T200 as 3x harder
    pickRandomDistinct(t200, 2).forEach(it => pushItem(it, W.HARDER_3X));
    // + 2 items T50 as 3x harder
    pickRandomDistinct(t50, 2).forEach(it => pushItem(it, W.HARDER_3X));
    // +150 coins as 2x harder
    pushCoins(150, W.HARDER_2X);
    // another spin normal
    pushRespin(W.NORMAL);
  } else if (wager === 200) {
    // all items T200 normal
    t200.forEach(it => pushItem(it, W.NORMAL));
    // + 2 items T500 as 5x harder
    pickRandomDistinct(t500, 2).forEach(it => pushItem(it, W.HARDER_5X));
    // + 2 items T100 as 2x harder
    pickRandomDistinct(t100, 2).forEach(it => pushItem(it, W.HARDER_2X));
    // +300 coins as 3x harder
    pushCoins(300, W.HARDER_3X);
    // another spin normal
    pushRespin(W.NORMAL);
  } else {
    // safety net
    pushRespin(W.NORMAL);
  }

  // Ensure we have at least 6 slices
  while (baseSegs.length < 6) {
    pushRespin(W.NORMAL);
  }
  return { baseSegs, weights };
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

    // load or init global state
    let s = await prisma.spinState.findUnique({ where: { id: 'global' } });
    if (!s) s = await prisma.spinState.create({ data: { id: 'global', status: 'IDLE' } });

    // check busy
    if (s.status === 'SPINNING' && s.userId && s.userId !== me.sub) {
      return NextResponse.json({ error: 'busy', username: s.username || 'other' }, { status: 409 });
    }

    // balance
    const wallet = await prisma.wallet.upsert({
      where: { userId: me.sub },
      update: {},
      create: { userId: me.sub, balance: 0 },
    });
    if ((wallet.balance ?? 0) < w) {
      return NextResponse.json({ error: 'not_enough_coins', balance: wallet.balance ?? 0 }, { status: 400 });
    }

    // build weighted spec by wager
    const { baseSegs, weights } = await buildWeightedSpec(w);
    if (!baseSegs.length) {
      return NextResponse.json({ error: 'no_segments' }, { status: 400 });
    }

    // choose result with weights
    const resultIndex = pickWeightedIndex(weights);

    // deduct wager now
    await prisma.wallet.update({
      where: { userId: me.sub },
      data: { balance: { decrement: w } },
    });

    // save shared spin for all clients
    const durationMs = 10000;
    const updated = await prisma.spinState.update({
      where: { id: 'global' },
      data: {
        status: 'SPINNING',
        userId: me.sub,
        username: me.displayName || me.username || 'player',
        wager: w,
        segments: baseSegs,         // NOTE: weights are server-only
        resultIndex,
        spinStartAt: new Date(),
        durationMs,
      },
    });

    return NextResponse.json(
      {
        status: updated.status,
        userId: updated.userId,
        username: updated.username,
        wager: updated.wager,
        segments: updated.segments,
        resultIndex: updated.resultIndex,
        spinStartAt: updated.spinStartAt,
        durationMs: updated.durationMs,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e) {
    console.error('spin POST error', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
