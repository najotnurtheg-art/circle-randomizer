import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { setToken } from '@/app/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(req) {
  const { username, password } = await req.json();
  if (!username || !password) return NextResponse.json({ error: 'missing' }, { status: 400 });

  const exists = await prisma.user.findUnique({ where: { username } });
  if (exists) return NextResponse.json({ error: 'taken' }, { status: 400 });

  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { username, password: hash } });
  await prisma.wallet.create({ data: { userId: user.id } });
  setToken({ sub: user.id, role: user.role, username: user.username });
  return NextResponse.json({ ok: true });
}
