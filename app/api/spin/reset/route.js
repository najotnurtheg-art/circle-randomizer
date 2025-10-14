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

  // only spinner or admin can reset
  if (s.userId !== me.sub && me.role !== 'ADMIN') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  await prisma.spinState.update({
    where: { id: 'global' },
    data: { status: 'IDLE', userId: null, username: null, wager: null, segments: [], resultIndex: null }
  });

  return NextResponse.json({ ok: true });
}
