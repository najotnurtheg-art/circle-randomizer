import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const tierNum = Number(searchParams.get('tier') || '50');
  const t = tierNum === 50 ? 'T50' : tierNum === 100 ? 'T100' : 'T200';
  const items = await prisma.item.findMany({ where: { tier: t, isActive: true }, orderBy: { createdAt: 'desc' } });
  return NextResponse.json(items);
}
