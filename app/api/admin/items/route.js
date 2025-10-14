export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireAdmin } from '@/app/lib/auth';

export async function GET() {
  try { requireAdmin(); } catch { return NextResponse.json({ error: 'forbidden' }, { status: 403 }) }

  const items = await prisma.item.findMany({
    orderBy: [{ tier: 'asc' }, { createdAt: 'desc' }],
    take: 1000,
  });

  return NextResponse.json(items, { headers: { 'Cache-Control': 'no-store' } });
}
