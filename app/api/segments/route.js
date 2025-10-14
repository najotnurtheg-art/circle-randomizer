import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

const nextTier = (v) => (v === 50 ? 100 : v === 100 ? 200 : 50);
const tierKey  = (v) => (v === 50 ? 'T50' : v === 100 ? 'T100' : 'T200');

const priceByTier = (tier) =>
  tier === 'T50' ? 50 : tier === 'T100' ? 100 : tier === 'T200' ? 200 : 500;

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const W = Number(searchParams.get('tier') || '50');
  if (![50, 100, 200].includes(W)) {
    return NextResponse.json({ error: 'tier must be 50/100/200' }, { status: 400 });
  }

  // items for selected tier
  const items = await prisma.item.findMany({
    where: { tier: tierKey(W), isActive: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  // try to suggest a grand-prize from the next tier
  const grand = await prisma.item.findFirst({
    where: { tier: tierKey(nextTier(W)), isActive: true },
    orderBy: { createdAt: 'desc' },
  });

  const rows = [
    ...items,
    ...(grand ? [{ ...grand, name: `${grand.name} (Grand Prize)` }] : []),
  ];

  const out = rows.map((i) => ({
    id: i.id,
    name: i.name,
    tier: i.tier,
    price: priceByTier(i.tier),
    imageUrl: i.imageUrl || null,
  }));

  return NextResponse.json(out, { headers: { 'Cache-Control': 'no-store' } });
}
