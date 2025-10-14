export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireUser } from '@/app/lib/auth';

const ID = 'global';

export async function POST() {
  let me;
  try { me = requireUser(); } catch { return NextResponse.json({ error: 'unauth' }, { status: 401 }); }

  const s = await prisma.spinState.findUnique({ where: { id: ID } });
  if (!s || s.status !== 'SPINNING') {
    return NextResponse.json({ ok: true, released: false }, { headers: { 'Cache-Control': 'no-store' } });
  }

  const expired = s.spinStartAt && s.durationMs &&
    (Date.now() - new Date(s.spinStartAt).getTime() > Number(s.durationMs));

  if (s.userId !== me.sub && !expired) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  await prisma.spinState.update({
    where: { id: ID },
    data: {
      status: 'IDLE',
      userId: null, username: null, wager: null,
      segments: [], resultIndex: null, spinStartAt: null, durationMs: null,
    },
  });

  return NextResponse.json({ ok: true, released: true }, { headers: { 'Cache-Control': 'no-store' } });
}
