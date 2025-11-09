export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET() {
  try {
    let s = await prisma.spinState.findUnique({ where: { id: 'global' } });
    if (!s) {
      s = await prisma.spinState.create({ data: { id: 'global', status: 'IDLE' } });
    }

    // Do NOT auto-clear here; /complete will clear.
    return NextResponse.json(
      {
        status: s.status,
        userId: s.userId || null,
        username: s.username || null,
        wager: s.wager || null,
        segments: s.segments || [],
        resultIndex: s.resultIndex ?? null,
        spinStartAt: s.spinStartAt || null,
        durationMs: s.durationMs || null,
        updatedAt: s.updatedAt,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e) {
    console.error('state GET error', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
