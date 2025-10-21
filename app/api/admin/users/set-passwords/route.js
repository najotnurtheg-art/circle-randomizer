export const dynamic = 'force-dynamic';
export const revalidate = 0;
// Force Node runtime so bcryptjs works on Vercel
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireAdmin } from '@/app/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(req) {
  try { requireAdmin(); } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const { userId, password } = body || {};
  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }
  if (typeof password !== 'string' || password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const hash = await bcrypt.hash(password, 12);
    await prisma.user.update({ where: { id: userId }, data: { password: hash } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    // Surface the real reason to the client for debugging
    return NextResponse.json({ error: `set-password failed: ${e?.message || e}` }, { status: 500 });
  }
}
