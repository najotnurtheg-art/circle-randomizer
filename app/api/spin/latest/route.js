export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET() {
  const rows = await prisma.spinLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { user: { select: { displayName: true, username: true } } },
  });

  const out = rows.map(r => ({
    id: r.id,
    prize: r.prize,
    when: r.createdAt,
    displayName: r.user?.displayName || r.user?.username || r.username || 'Player',
  }));

  return NextResponse.json(out, { headers: { 'Cache-Control': 'no-store' } });
}
