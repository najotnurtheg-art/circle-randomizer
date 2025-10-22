export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

const tierNum = (e) => (e === 'T50' ? 50 : e === 'T100' ? 100 : e === 'T200' ? 200 : 500);

export async function GET() {
  try {
    const items = await prisma.item.findMany({
      where: { isActive: true },
      orderBy: [{ tier: 'asc' }, { updatedAt: 'desc' }],
      select: { id: true, name: true, tier: true, imageUrl: true },
    });

    const out = items.map((i) => ({
      id: i.id,
      name: i.name,
      tier: tierNum(i.tier),
      imageUrl: i.imageUrl || null,
    }));

    return NextResponse.json(out, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('items/all', e);
    return NextResponse.json([], { status: 200 });
  }
}
