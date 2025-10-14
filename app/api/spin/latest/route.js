export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET() {
  const rows = await prisma.win.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { user: true },
  });

  const out = rows.map(w => ({
    id: w.id,
    prize: w.prize,
    coins: Number(w.coins || 0),
    imageUrl: w.imageUrl || null,
    displayName: w.user?.displayName || w.user?.username || 'User',
    when: w.createdAt,
  }));

  return NextResponse.json(out, { headers: { 'Cache-Control': 'no-store' } });
}
