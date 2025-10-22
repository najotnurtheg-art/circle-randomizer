// app/api/items/all/route.js
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET() {
  const items = await prisma.item.findMany({
    where:{ isActive:true },
    orderBy:[{ tier:'asc' }, { createdAt:'asc' }]
  });
  const out = items.map(i => ({
    id: i.id, name: i.name,
    tier: i.tier === 'T50' ? 50 : i.tier === 'T100' ? 100 : i.tier === 'T200' ? 200 : 500,
    imageUrl: i.imageUrl || null
  }));
  return NextResponse.json(out, { headers:{'Cache-Control':'no-store'} });
}
