// app/api/spin/route.js
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getUser } from '@/app/lib/auth';

// Weight map the way you asked:
// normal = 10, 3x harder = 3, 2x harder = 5, 5x harder = 2
const W = {
  NORMAL: 10,
  HARDER_3X: 3,
  HARDER_2X: 5,
  HARDER_5X: 2,
};

function pickTwoRandom(arr) {
  if (arr.length <= 2) return arr.slice(0, 2);
  const i = Math.floor(Math.random() * arr.length);
  let j = Math.floor(Math.random() * (arr.length - 1));
  if (j >= i) j++;
  return [arr[i], arr[j]];
}

function buildWheelSegments({ t50, t100, t200, t500 }, wager) {
  const segs = [];
  const weights = [];

  const pushItem = (it, w) => {
    segs.push({ type: 'item', id: it.id, name: it.name, imageUrl: it.imageUrl || null });
    weights.push(w);
  };
  const pushCoins = (amount, w) => {
    segs.push({ type: 'coins', amount });
    weights.push(w);
  };
  const pushRespin = (w) => {
    segs.push({ type: 'respin' });
    weights.push(w);
  };

  if (wager === 50) {
    // all 50-tier items: normal
    t50.forEach((it) => pushItem(it, W.NORMAL));
    // 2 items from 100-tier: 3x harder
    pickTwoRandom(t100).forEach((it) => pushItem(it, W.HARDER_3X));
    // +75 coins: 2x harder
    pushCoins(75, W.HARDER_2X);
    // another spin: normal
    pushRespin(W.NORMAL);
  } else if (wager === 100) {
    // all 100-tier items: normal
    t100.forEach((it) => pushItem(it, W.NORMAL));
    // 2 items from 200-tier: 3x harder
    pickTwoRandom(t200).forEach((it) => pushItem(it, W.HARDER_3X));
    // 2 items from 50-tier: 3x harder
    pickTwoRandom(t50).forEach((it) => pushItem(it, W.HARDER_3X));
    // +150 coins: 2x harder
    pushCoins(150, W.HARDER_2X);
    // another spin: normal
    pushRespin(W.NORMAL);
  } else if (wager === 200) {
    // all 200-tier items: normal
    t200.forEach((it) => pushItem(it, W.NORMAL));
    // 2 items from 500-tier: 5x harder
    pickTwoRandom(t500).forEach((it) => pushItem(it, W.HARDER_5X));
    // 2 items from 100-tier: 2x harder
    pickTwoRandom(t100).forEach((it) => pushItem(it, W.HARDER_2X));
    // +300 coins: 3x harder
    pushCoins(300, W.HARDER_3X);
    // another spin: normal
    pushRespin(W.NORMAL);
  } else {
    // fallback: behave as 50
    return buildWheelSegments({ t50, t100, t200, t500 }, 50);
  }

  // compute a weighted resultIndex for these *unique* segments
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  let resultIndex = 0;
  for (let i = 0; i < weights.length; i++) {
    if (r < weights[i]) {
      resultIndex = i;
      break;
    }
    r -= weights[i];
  }

  const reward = segs[resultIndex];
  return { segs, resultIndex, reward };
}

export async function POST(req) {
  try {
    const me = await getUser();
    const { wager } = await req.json();

    if (![50, 100, 200].includes(Number(wager))) {
      return NextResponse.json({ error: 'bad_wager' }, { status: 400 });
    }

    // Prevent overlap
    const existing = await prisma.spinState.findUnique({ where: { id: 'global' } });
    if (existing && existing.status === 'SPINNING' && existing.userId && existing.userId !== me.sub) {
      return NextResponse.json({ error: 'busy' }, { status: 409 });
    }

    // Check balance (do NOT deduct here)
    const wallet = await prisma.wallet.upsert({
      where: { userId: me.sub },
      update: {},
      create: { userId: me.sub, balance: 0 },
      select: { balance: true },
    });

    if ((wallet.balance ?? 0) < Number(wager)) {
      return NextResponse.json({ error: 'not_enough_coins' }, { status: 402 });
    }

    // Fetch active items
    const items = await prisma.item.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, tier: true, imageUrl: true },
    });

    const t50 = items.filter((i) => i.tier === 'T50');
    const t100 = items.filter((i) => i.tier === 'T100');
    const t200 = items.filter((i) => i.tier === 'T200');
    const t500 = items.filter((i) => i.tier === 'T500');

    const { segs, resultIndex, reward } = buildWheelSegments({ t50, t100, t200, t500 }, Number(wager));

    // Announce spin
    const durationMs = 10000; // 10s animation
    const spinStartAt = new Date();

    await prisma.spinState.upsert({
      where: { id: 'global' },
      update: {
        status: 'SPINNING',
        userId: me.sub,
        username: me.name || me.username || me.sub,
        wager: Number(wager),
        segments: segs,
        resultIndex,
        spinStartAt,
        durationMs,
        pendingReward: reward,
      },
      create: {
        id: 'global',
        status: 'SPINNING',
        userId: me.sub,
        username: me.name || me.username || me.sub,
        wager: Number(wager),
        segments: segs,
        resultIndex,
        spinStartAt,
        durationMs,
        pendingReward: reward,
      },
    });

    return NextResponse.json({
      status: 'SPINNING',
      userId: me.sub,
      username: me.name || me.username || me.sub,
      wager: Number(wager),
      segments: segs,
      resultIndex,
      spinStartAt,
      durationMs,
    });
  } catch (err) {
    console.error('spin start error', err);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
