export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireAdmin } from '@/app/lib/auth';

export async function POST(req) {
  try { requireAdmin(); } catch { return NextResponse.json({ error: 'forbidden' }, { status: 403 }); }

  const { userId, displayName } = await req.json().catch(() => ({}));
  if (!userId || !displayName || !displayName.trim()) {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }
  await prisma.user.update({ where: { id: userId }, data: { displayName: displayName.trim() } });
  return NextResponse.json({ ok: true });
}
