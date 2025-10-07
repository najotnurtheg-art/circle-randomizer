export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { setToken } from '@/app/lib/auth';
import { verifyTelegramInitData, getTelegramUser } from '@/app/lib/telegram';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function POST(req) {
  const { initData } = await req.json().catch(() => ({}));
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!initData || !token) {
    return NextResponse.json({ error: 'missing initData or token' }, { status: 400 });
  }

  const ok = verifyTelegramInitData(initData, token);
  if (!ok) return NextResponse.json({ error: 'bad signature' }, { status: 401 });

  const tgUser = getTelegramUser(initData);
  if (!tgUser) return NextResponse.json({ error: 'no user' }, { status: 400 });

  // Build a safe unique username like tg_12345678
  const username = tgUser.username ? `tg_${tgUser.id}_${tgUser.username}` : `tg_${tgUser.id}`;
  let user = await prisma.user.findUnique({ where: { username } });

  if (!user) {
    const randomPwd = crypto.randomBytes(16).toString('hex');
    const hash = await bcrypt.hash(randomPwd, 10);
    user = await prisma.user.create({
      data: { username, password: hash }
    });
    await prisma.wallet.create({ data: { userId: user.id } });
  }

  setToken({ sub: user.id, role: user.role, username: user.username });
  return NextResponse.json({ ok: true });
}
