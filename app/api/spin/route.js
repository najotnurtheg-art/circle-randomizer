import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireUser } from '@/app/lib/auth';

const TIERS = [50, 100, 200];
function nextTier(v) { return v === 50 ? 100 : v === 100 ? 200 : 50; }
function tierKey(v) { return v === 50 ? 'T50' : v === 100 ? 'T100' : 'T200'; }

export async function POST(req) {
  let me;
  try { me = requireUser(); } catch { return NextResponse.json({ error: 'unauth' }, { status: 401 }); }
  const { wager } = await req.json();
  const W = Number(wager);
  if (!TIERS.includes(W)) return NextResponse.json({ error: 'wager must be 50/100/200' }, { status: 400 });

  const wallet = await prisma.wallet.findUnique({ where: { userId: me.sub } });
  if (!wallet || wallet.balance < W) return NextResponse.json({ error: 'insufficient_funds' }, { status: 400 });

  // fetch items for selected tier
  const items = await prisma.item.findMany({ where: { tier: tierKey(W), isActive: true }, orderBy: { createdAt: 'desc' } });

  // pick one random item from next tier
  const nextItems = await prisma.item.findMany({ where: { tier: tierKey(nextTier(W)), isActive: true } });
  const randomNext = nextItems.length ? nextItems[Math.floor(Math.random() * nextItems.length)] : null;

  // build segments (names)
  const segments = [
    ...items.map(i => ({ type: 'item', name: i.name, tier: W })),
    { type: 'another_spin' },
    { type: 'coins', amount: nextTier(W) },
  ];
  if (randomNext) segments.push({ type: 'item', name: randomNext.name, tier: nextTier(W) });

  // charge wager up front
  await prisma.wallet.update({ where: { userId: me.sub }, data: { balance: { decrement: W } } });

  // random result
  const idx = Math.floor(Math.random() * segments.length);
  const result = segments[idx];

  // payout if coins
  let payout = 0;
  if (result.type === 'coins') {
    payout = result.amount;
    await prisma.wallet.update({ where: { userId: me.sub }, data: { balance: { increment: payout } } });
  }
  // item win would go to a log or inventory (skipped for MVP)

  // return new balance
  const bal = await prisma.wallet.findUnique({ where: { userId: me.sub } });

  return NextResponse.json({
    segments,
    resultIndex: idx,
    result,
    balance: bal?.balance ?? 0
  });
}
