import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET() {
  // make sure the single row exists
  let s = await prisma.spinState.findUnique({ where: { id: 'global' } });
  if (!s) s = await prisma.spinState.create({ data: { id: 'global', status: 'IDLE' } });

  return NextResponse.json({
    status: s.status,        // IDLE | SPINNING | RESULT
    username: s.username || null,
    wager: s.wager || null,
    segments: s.segments || [],
    resultIndex: s.resultIndex ?? null,
    updatedAt: s.updatedAt
  });
}
