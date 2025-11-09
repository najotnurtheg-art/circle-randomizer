export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET() {
  let s = await prisma.spinState.findUnique({ where: { id: 'global' } });

  if (!s) {
    s = await prisma.spinState.create({ data: { id: 'global', status: 'IDLE' } });
  }

  // Auto-reset if spin should have already finished (prevents stuck SPINNING)
  if (s.status === 'SPINNING' && s.spinStartAt && s.durationMs) {
    const doneAt = new Date(s.spinStartAt).getTime() + Number(s.durationMs);
    if (Date.now() >= doneAt + 200) {
      s = await prisma.spinState.update({
        where: { id: 'global' },
        data: {
          status: 'IDLE',
          userId: null,
          username: null,
          wager: null,
          segments: [],
          resultIndex: null,
          spinStartAt: null,
          durationMs: null,
        },
      });
    }
  }

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
}
