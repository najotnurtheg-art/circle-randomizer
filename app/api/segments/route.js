import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

const nextTier = (v) => (v === 50 ? 100 : v === 100 ? 200 : 50);
const tierKey  = (v) => (v === 50 ? 'T50' : v === 100 ? 'T100' : 'T200');

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const W = Number(searchParams.get('tier') || '50');
  if (![50,100,200].includes(W)) return NextResponse.json({ error: 'tier must be 50/100/200' }, { status: 400 });

  // items for selected tier
  const items = await prisma.item.findMany({
    where: { tier: tierKey(W), isActive: true },
    orderBy: { createdAt: 'desc' }
  });

  // next-tier random item
  const nextItems = await prisma.item.findMany({
    where: { tier: tierKey(nextTier(W)), isActive: true }
  });
  const randomNext = nextItems.length ? nextItems[Math.floor(Math.random()*nextItems.length)] : null;

  // grand prize (500) shows when previewing 200
  let grandPrize = null;
  if (W === 200) {
    const gp = await prisma.item.findMany({ where: { tier:'T500', isActive:true } });
    if (gp.length) grandPrize = gp[Math.floor(Math.random()*gp.length)];
  }

  const segments = [
    ...items.map(i => ({ type:'item', name:i.name, tier:W, imageUrl:i.imageUrl||null })),
    { type:'another_spin' },
    { type:'coins', amount: nextTier(W) },
  ];
  if (randomNext) segments.push({ type:'item', name:randomNext.name, tier:nextTier(W), imageUrl:randomNext.imageUrl||null });
  if (grandPrize) segments.push({ type:'item', name:grandPrize.name, tier:500, imageUrl:grandPrize.imageUrl||null, grand:true });

  return NextResponse.json({ segments });
}
