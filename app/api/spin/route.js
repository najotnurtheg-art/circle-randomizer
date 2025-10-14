export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireUser } from '@/app/lib/auth';

const TIERS = [50, 100, 200];
const nextTier = (v) => (v === 50 ? 100 : v === 100 ? 200 : 50);
const tierKey  = (v) => (v === 50 ? 'T50' : v === 100 ? 'T100' : 'T200');

// choose an index using integer weights
function weightedIndex(weights) {
  const total = weights.reduce((a,b)=>a+b, 0);
  let r = Math.floor(Math.random() * total);
  for (let i = 0; i < weights.length; i++) {
    if ((r -= weights[i]) < 0) return i;
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

  // Ensure state row exists
  let state = await prisma.spinState.findUnique({ where: { id: 'global' } });
  if (!state) state = await prisma.spinState.create({ data: { id: 'global', status: 'IDLE' } });

  if (state.status !== 'IDLE') {
    return NextResponse.json({ error: `busy: ${state.username || 'another user'} is spinning` }, { status: 409 });
  }

  // Balance check
  const wallet = await prisma.wallet.findUnique({ where: { userId: me.sub } });
  if (!wallet || wallet.balance < W) return NextResponse.json({ error: 'insufficient_funds' }, { status: 400 });

  // Base-tier items
  const items = await prisma.item.findMany({
    where: { tier: tierKey(W), isActive: true },
    orderBy: { createdAt: 'desc' }
  });

  // Next-tier random item (one)
  const nextItems = await prisma.item.findMany({
    where: { tier: tierKey(nextTier(W)), isActive: true }
  });
  const randomNext = nextItems.length ? nextItems[Math.floor(Math.random() * nextItems.length)] : null;

  // 500 grand prize appears only inside 200-spin
  let grandPrize = null;
  if (W === 200) {
    const gp = await prisma.item.findMany({ where: { tier: 'T500', isActive: true } });
    if (gp.length) grandPrize = gp[Math.floor(Math.random() * gp.length)];
  }

  // Build visible segments
  const segments = [
    ...items.map(i => ({ type:'item', name:i.name, tier:W, imageUrl:i.imageUrl||null })),
    { type:'another_spin' },
    { type:'coins', amount: nextTier(W) },
  ];
  if (randomNext) segments.push({ type:'item', name:randomNext.name, tier:nextTier(W), imageUrl:randomNext.imageUrl||null });
  if (grandPrize) segments.push({ type:'item', name:grandPrize.name, tier:500, imageUrl:grandPrize.imageUrl||null, grand:true });

  if (!segments.length) return NextResponse.json({ error: 'no items for this tier yet' }, { status: 400 });

  // ---------- WEIGHTED RANDOM PICK ----------
  const weights = segments.map(() => 3); // default weight 3

  // Make next-tier item 3× rarer
  segments.forEach((seg, i) => {
    if (seg.type === 'item' && seg.tier === nextTier(W)) {
      weights[i] = 1;
    }
  });

  // NEW: make 500-grand prize 5× harder than normal (weight = 0.6 instead of 3)
  segments.forEach((seg, i) => {
    if (seg.type === 'item' && seg.tier === 500) {
      weights[i] = 0.6; // ≈5× less chance (3 / 0.6 = 5)
    }
  });

  const idx = weightedIndex(weights);
  const result = segments[idx];
  // ---------- end weighted pick ----------

  const durationMs = 10000;
  const spinStartAt = new Date();

  // Debit + lock
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

  if (result.type === 'coins') {
    await prisma.wallet.update({ where: { userId: me.sub }, data: { balance: { increment: result.amount } } });
  }

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
