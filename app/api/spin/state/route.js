export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

const ID = 'global';

function idlePayload() {
  return {
    status: 'IDLE',
    userId: null,
    username: null,
    wager: null,
    segments: [],
    resultIndex: null,
    spinStartAt: null,
    durationMs: null,
  };
}

export async function GET() {
  let s = await prisma.spinState.findUnique({ where: { id: ID } });
  if (!s) s = await prisma.spinState.create({ data: { id: ID, status: 'IDLE' } });

  if (s.status === 'SPINNING' && s.spinStartAt && s.durationMs) {
    const started = new Date(s.spinStartAt).getTime();
    const grace = 1500;
    if (Date.now() > started + Number(s.durationMs) + grace) {
      await prisma.spinState.update({
        where: { id: ID },
        data: {
          status: 'IDLE',
          userId: null, username: null, wager: null,
          segments: [], resultIndex: null, spinStartAt: null, durationMs: null,
        },
      });
      return NextResponse.json(idlePayload(), { headers: { 'Cache-Control': 'no-store' } });
    }
  }

  const payload = s.status === 'SPINNING'
    ? {
        status: 'SPINNING',
        userId: s.userId,
        username: s.username,
        wager: s.wager,
        segments: s.segments || [],
        resultIndex: s.resultIndex,
        spinStartAt: s.spinStartAt,
        durationMs: s.durationMs || 10000,
      }
    : idlePayload();

  return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } });
}
