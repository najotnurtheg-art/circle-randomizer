// app/api/spin/latest/route.js
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET() {
  try {
    const rows = await prisma.spinLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, username: true, prize: true, createdAt: true },
    });

    const out = rows.map(r => ({
      id: r.id,
      displayName: r.username,
      prize: r.prize,
      when: r.createdAt,
    }));

    return NextResponse.json(out, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('latest wins error', e);
    return NextResponse.json([], { headers: { 'Cache-Control': 'no-store' } });
  }
}
