// app/api/store/list/route.js
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

const priceOfTier = (tier) => {
  switch (tier) {
    case 'T50': return 50;
    case 'T100': return 100;
    case 'T200': return 200;
    case 'T500': return 500;
    default: return null;
  }
};

export async function GET() {
  // Only show active + explicitly marked for store
  const items = await prisma.item.findMany({
    where: { isActive: true, purchasable: true },
    orderBy: [{ tier: 'asc' }, { createdAt: 'desc' }],
    take: 200,
  });

  const out = items
    .map(it => ({
      id: it.id,
      name: it.name,
      price: priceOfTier(it.tier),
      imageUrl: it.imageUrl || null,
    }))
    .filter(x => x.price != null);

  return NextResponse.json(out, { headers: { 'Cache-Control': 'no-store' } });
}
