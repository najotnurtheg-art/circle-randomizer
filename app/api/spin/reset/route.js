import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getUser } from '@/app/lib/auth';

export async function POST() {
  const me = getUser();
  if (!me) return NextResponse.json({ error: 'unauth' }, { status: 401 });

  const s = await prisma.spinState.findUnique({ where: { id: 'global' } });
  if (!s) {
    await prisma.spinState.create({ data: { id: 'global', status: 'IDLE' } });
    return NextResponse.json({ ok: true });
  }

  const isAdmin = me.role === 'ADMIN';
  const isOwner =
    s.status === 'SPINNING' &&
    s.userId === me.sub &&
    s.spinStartAt &&
    Date.now() - new Date(s.spinStartAt).getTime() > (s.durationMs || 5000) + 3000;

  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  await prisma.spinState.update({
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
      popup: null,
    },
  });

  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
