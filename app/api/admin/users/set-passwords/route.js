export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireAdmin } from '@/app/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(req) {
  try { requireAdmin(); } catch { return NextResponse.json({ error: 'forbidden' }, { status: 403 }); }

  const { userId, password } = await req.json().catch(() => ({}));
  if (!userId || typeof password !== 'string' || password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const hash = await bcrypt.hash(password, 12);
  await prisma.user.update({ where: { id: userId }, data: { password: hash } });

  // We do NOT return the hash. Admin already knows the new password they typed.
  return NextResponse.json({ ok: true });
}
