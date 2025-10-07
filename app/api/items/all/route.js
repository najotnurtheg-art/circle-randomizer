import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

const tierNum = (t) => t === 'T50' ? 50 : t === 'T100' ? 100 : t === 'T200' ? 200 : 500;

export async function GET() {
  const items = await prisma.item.findMany({
    where: { isActive: true },
    orderBy: [{ tier: 'asc' }, { createdAt: 'desc' }]
  });
  const out = items.map(i => ({ id:i.id, name:i.name, tier: tierNum(i.tier), imageUrl:i.imageUrl||null }));
  return NextResponse.json(out);
}
