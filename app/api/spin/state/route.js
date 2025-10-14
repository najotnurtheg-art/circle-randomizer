export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

const ID = 'global';

function idle() {
  return {
    status: 'IDLE',
    userId: null,
    username: null,
    wager: null,
    segments: [],
    resultIndex: null,
    spinStartAt: null,
    durationMs: null,
    popup: null,
  };
}

export async function GET() {
  // ensure row
  let s = await prisma.spinState.findUnique({ where: { id: ID } });
  if (!s) {
    s = await prisma.spinState.create({ data: { id: ID, status: 'IDLE' } });
  }

  // auto-reset if spin expired
  if (s.status === 'SPINNING' && s.spinStartAt && s.durationMs) {
    const started = new Date(s.spinStartAt).getTime();
    const grace = 3_000; // small grace to allow client to finish animation
    if (Date.now() > started + Number(s.durationMs) + grace) {
      s = await prisma.spinState.update({
        where: { id: ID },
        data: {
          status: 'IDLE',
          userId: null,
          username: null,
          wager: null,
          segments: [],
          resultIndex: null,
          spinStartAt: null,
          durationMs: null,
          popup: null,
        },
      });
      return NextResponse.json(idle(), { headers: { 'Cache-Control': 'no-store' } });
    }
  }

  // return current payload (without DB-specific fields)
  const payload =
    s.status === 'SPINNING'
      ? {
          status: s.status,
          userId: s.userId,
          username: s.username,
          wager: s.wager,
          segments: s.segments || [],
          resultIndex: s.resultIndex ?? null,
          spinStartAt: s.spinStartAt,
          durationMs: s.durationMs,
          popup: s.popup ?? null,
        }
      : idle();

  return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } });
}
