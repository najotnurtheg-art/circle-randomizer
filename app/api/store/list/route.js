export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

const priceByTier = (tier) =>
  tier === 'T50' ? 50 : tier === 'T100' ? 100 : tier === 'T200' ? 200 : 500;

export async function GET() {
  const rows = await prisma.item.findMany({
    where: { isActive: true, purchasable: true },
    orderBy: [{ tier: 'asc' }, { createdAt: 'desc' }],
    take: 500,
  });

  const out = rows.map((i) => ({
    id: i.id,
    name: i.name,
    tier: i.tier,
    price: priceByTier(i.tier),
    imageUrl: i.imageUrl || null,
  }));

  return NextResponse.json(out, { headers: { 'Cache-Control': 'no-store' } });
}
