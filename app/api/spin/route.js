import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireUser } from '@/app/lib/auth';

const TIERS = [50, 100, 200];
const nextTier = (v) => (v === 50 ? 100 : v === 100 ? 200 : 50);
const tierKey  = (v) => (v === 50 ? 'T50' : v === 100 ? 'T100' : 'T200');

function buildLabel(seg) {
  if (!seg) return '';
  if (seg.type === 'item') return seg.name;
  if (seg.type === 'coins') return `+${seg.amount} coins`;
  return 'Another spin';
}

export async function POST(req) {
  let me;
  try { me = requireUser(); } catch { return NextResponse.json({ error: 'unauth' }, { status: 401 }); }

  const { wager } = await req.json();
  const W = Number(wager);
  if (!TIERS.includes(W)) return NextResponse.json({ error: 'wager must be 50/100/200' }, { status: 400 });

  // ensure state row exists
  let state = await prisma.spinState.findUnique({ where: { id: 'global' } });
  if (!state) state = await prisma.spinState.create({ data: { id: 'global', status: 'IDLE' } });

  if (state.status !== 'IDLE' && state.userId !== me.sub) {
    return NextResponse.json({ error: `busy: ${state.username} is spinning` }, { status: 409 });
  }

  // balance check
  const wallet = await prisma.wallet.findUnique({ where: { userId: me.sub } });
  if (!wallet || wallet.balance < W) return NextResponse.json({ error: 'insufficient_funds' }, { status: 400 });

  // base items for this tier
  const items = await prisma.item.findMany({
    where: { tier: tierKey(W), isActive: true },
    orderBy: { createdAt: 'desc' }
  });

  // next-tier random item
  const nextItems = await prisma.item.findMany({ where: { tier: tierKey(nextTier(W)), isActive: true } });
  const randomNext = nextItems.length ? nextItems[Math.floor(Math.random() * nextItems.length)] : null;

  // GRAND PRIZE (T500) only in 200 spin
  let grandPrize = null;
  if (W === 200) {
    const gp = await prisma.item.findMany({ where: { tier: 'T500', isActive: true } });
    if (gp.length) grandPrize = gp[Math.floor(Math.random() * gp.length)];
  }

  const segments = [
    ...items.map(i => ({ type: 'item', name: i.name, tier: W, imageUrl: i.imageUrl || null })),
    { type: 'another_spin' },
    { type: 'coins', amount: nextTier(W) },
  ];
  if (randomNext) segments.push({ type: 'item', name: randomNext.name, tier: nextTier(W), imageUrl: randomNext.imageUrl || null });
  if (grandPrize) segments.push({ type: 'item', name: grandPrize.name, tier: 500, imageUrl: grandPrize.imageUrl || null, grand: true });

  if (!segments.length) return NextResponse.json({ error: 'no items for this tier yet' }, { status: 400 });

  // debit + lock
  await prisma.$transaction(async (tx) => {
    await tx.wallet.update({ where: { userId: me.sub }, data: { balance: { decrement: W } } });
    await tx.spinState.update({
      where: { id: 'global' },
      data: { status: 'SPINNING', userId: me.sub, username: me.username, wager: W, segments }
    });
  });

  // RNG
  const idx = Math.floor(Math.random() * segments.length);
  const result = segments[idx];

  // payout if coins
  if (result.type === 'coins') {
    await prisma.wallet.update({ where: { userId: me.sub }, data: { balance: { increment: result.amount } } });
  }

  await prisma.spinState.update({ where: { id: 'global' }, data: { status: 'RESULT', resultIndex: idx } });
  const bal = await prisma.wallet.findUnique({ where: { userId: me.sub } });

  return NextResponse.json({
    status: 'RESULT',
    username: me.username,
    segments,
    resultIndex: idx,
    result,
    balance: bal?.balance ?? 0,
    labels: segments.map(buildLabel),
  });
}
