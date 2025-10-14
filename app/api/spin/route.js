export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireUser } from '@/app/lib/auth';

const TIERS = [50, 100, 200];
const nextTier = (v) => (v === 50 ? 100 : v === 100 ? 200 : 50);
const tierKey  = (v) => (v === 50 ? 'T50' : v === 100 ? 'T100' : 'T200');

// weighted pick (supports float weights)
function weightedIndex(weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r < 0) return i;
  }
  return weights.length - 1;
}

function prizeText(seg){
  if (!seg) return '';
  if (seg.type === 'item') return seg.name;
  if (seg.type === 'coins') return `Coins +${seg.amount}`;
  return 'Another spin';
}

export async function POST(req) {
  let me;
  try { me = requireUser(); } catch { return NextResponse.json({ error: 'unauth' }, { status: 401 }); }

  const { wager } = await req.json();
  const W = Number(wager);
  if (!TIERS.includes(W)) return NextResponse.json({ error: 'wager must be 50/100/200' }, { status: 400 });

  const dbUser = await prisma.user.findUnique({ where: { id: me.sub } });
  const niceName = dbUser?.displayName || dbUser?.username || 'Player';

  // ensure spin state row
  let state = await prisma.spinState.findUnique({ where: { id: 'global' } });
  if (!state) state = await prisma.spinState.create({ data: { id: 'global', status: 'IDLE' } });

  // strict lock
  if (state.status !== 'IDLE') {
    return NextResponse.json({ error: `busy: ${state.username || 'another user'} is spinning` }, { status: 409 });
  }

  // balance
  const wallet = await prisma.wallet.findUnique({ where: { userId: me.sub } });
  if (!wallet || wallet.balance < W) return NextResponse.json({ error: 'insufficient_funds' }, { status: 400 });

  // same-tier items
  const items = await prisma.item.findMany({
    where: { tier: tierKey(W), isActive: true },
    orderBy: { createdAt: 'desc' }
  });

  // one random next-tier item
  const nextItems = await prisma.item.findMany({
    where: { tier: tierKey(nextTier(W)), isActive: true }
  });
  const randomNext = nextItems.length ? nextItems[Math.floor(Math.random() * nextItems.length)] : null;

  // 500 item (grand) can appear only in 200-spin
  let grandPrizeItem = null;
  if (W === 200) {
    const gp = await prisma.item.findMany({ where: { tier: 'T500', isActive: true } });
    if (gp.length) grandPrizeItem = gp[Math.floor(Math.random() * gp.length)];
  }

  // -------- Build visible segments --------
  const segments = [
    ...items.map(i => ({ type:'item', name:i.name, tier:W, imageUrl:i.imageUrl||null })),
    { type:'another_spin' },
  ];

  // coin prizes by tier (as requested)
  if (W === 50) {
    segments.push({ type:'coins', amount: 75 });
    segments.push({ type:'coins', amount: 100 });
    segments.push({ type:'coins', amount: 100 });
  } else if (W === 100) {
    segments.push({ type:'coins', amount: 150 });
    segments.push({ type:'coins', amount: 50 });
    segments.push({ type:'coins', amount: 200 });
  } else if (W === 200) {
    segments.push({ type:'coins', amount: 300 });
    segments.push({ type:'coins', amount: 100 });
    segments.push({ type:'coins', amount: 500 });
    segments.push({ type:'coins', amount: 500 });
  }

  // extra items: next-tier item, and 500-tier item inside 200 spin
  if (randomNext) segments.push({ type:'item', name:randomNext.name, tier:nextTier(W), imageUrl:randomNext.imageUrl||null });
  if (grandPrizeItem) segments.push({ type:'item', name:grandPrizeItem.name, tier:500, imageUrl:grandPrizeItem.imageUrl||null, grand:true });

  if (!segments.length) return NextResponse.json({ error: 'no items for this tier yet' }, { status: 400 });

  // -------- Weights --------
  // base weight = 3 for everything
  const weights = segments.map(() => 3);

  // make the single next-tier ITEM 3× harder
  segments.forEach((seg, i) => {
    if (seg.type === 'item' && seg.tier === nextTier(W)) {
      weights[i] = 1; // 3× rarer vs 3
    }
  });

  // make the 500-tier ITEM in 200-spin 5× harder (vs base 3)
  segments.forEach((seg, i) => {
    if (seg.type === 'item' && seg.tier === 500) {
      weights[i] = 0.6; // 3 / 0.6 = 5× harder
    }
  });

  // coin-specific weights per tier
  segments.forEach((seg, i) => {
    if (seg.type !== 'coins') return;

    if (W === 50) {
      // 75 coins: 2× harder -> weight 1.5
      if (seg.amount === 75) weights[i] = 1.5;
      // 100 coins: 3× harder -> weight 1
      if (seg.amount === 100) weights[i] = 1;
    }

    if (W === 100) {
      // 150 coins: 2× harder -> 1.5
      if (seg.amount === 150) weights[i] = 1.5;
      // 50 coins: 2× easier -> weight 6
      if (seg.amount === 50) weights[i] = 6;
      // 200 coins: 3× harder -> 1
      if (seg.amount === 200) weights[i] = 1;
    }

    if (W === 200) {
      // 300 coins: 2× harder -> 1.5
      if (seg.amount === 300) weights[i] = 1.5;
      // 100 coins: 2× easier -> 6
      if (seg.amount === 100) weights[i] = 6;
      // 500 coins: 5× harder -> 0.6
      if (seg.amount === 500) weights[i] = 0.6;
    }
  });

  // pick with weights
  const idx = weightedIndex(weights);
  const result = segments[idx];

  // spin timings
  const durationMs = 10000;
  const spinStartAt = new Date();

  // charge wager + lock state
  await prisma.$transaction(async (tx) => {
    await tx.wallet.update({ where: { userId: me.sub }, data: { balance: { decrement: W } } });
    await tx.spinState.update({
      where: { id: 'global' },
      data: {
        status: 'SPINNING',
        userId: me.sub,
        username: niceName,
        wager: W,
        segments,
        resultIndex: idx,
        spinStartAt,
        durationMs
      }
    });
  });

  // immediate payout for coin wins
  if (result.type === 'coins') {
    await prisma.wallet.update({ where: { userId: me.sub }, data: { balance: { increment: result.amount } } });
  }

  // log result
  await prisma.spinLog.create({
    data: { userId: me.sub, username: dbUser.username, wager: W, prize: prizeText(result) }
  });

  const bal = await prisma.wallet.findUnique({ where: { userId: me.sub } });

  return NextResponse.json({
    status: 'SPINNING',
    userId: me.sub,
    username: niceName,
    segments,
    resultIndex: idx,
    spinStartAt,
    durationMs,
    result,
    balance: bal?.balance ?? 0
  }, { headers: { 'Cache-Control': 'no-store' } });
}
