export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import bcrypt from 'bcryptjs';
// import { requireAdmin } from '@/app/lib/auth';

function makeTempPassword(len = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$%';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export async function POST(req) {
  // try { requireAdmin(); } catch { return NextResponse.json({ error: 'forbidden' }, { status: 403 }); }

  const { userId } = await req.json().catch(() => ({}));
  if (!userId) return NextResponse.json({ error: 'bad request' }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const tempPassword = makeTempPassword(10);
  const hash = await bcrypt.hash(tempPassword, 12);

  await prisma.user.update({ where: { id: userId }, data: { password: hash } });

  // ⚠️ We only return the plaintext once. It is NOT stored anywhere.
  return NextResponse.json({ ok: true, tempPassword });
}
