export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { setToken } from '@/app/lib/auth';
import { verifyTelegramInitData, getTelegramUser, isFresh } from '@/app/lib/telegram';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function POST(req) {
  const { initData } = await req.json().catch(() => ({}));
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!initData || !botToken) {
    return NextResponse.json({ error: 'missing initData or token' }, { status: 400 });
  }

  // Verify signature for WebApp
  const ok = verifyTelegramInitData(initData, botToken);
  if (!ok) return NextResponse.json({ error: 'bad signature' }, { status: 401 });

  // Optional freshness (reject very old initData)
  if (!isFresh(initData, 600)) { // 10 minutes
    return NextResponse.json({ error: 'stale auth' }, { status: 401 });
  }

  const tgUser = getTelegramUser(initData);
  if (!tgUser || !tgUser.id) {
    return NextResponse.json({ error: 'no user' }, { status: 400 });
  }

  // Stable unique username — avoid collisions
  const username = tgUser.username
    ? `tg_${tgUser.id}_${tgUser.username}`
    : `tg_${tgUser.id}`;

  let user = await prisma.user.findUnique({ where: { username } });

  if (!user) {
    // Create a user with a random password (not used for login anyway)
    const randomPwd = crypto.randomBytes(16).toString('hex');
    const hash = await bcrypt.hash(randomPwd, 10);
    user = await prisma.user.create({
      data: { username, password: hash }
    });
    await prisma.wallet.create({ data: { userId: user.id } });
  }

  // Normal app session cookie
  setToken({ sub: user.id, role: user.role, username: user.username });

  return NextResponse.json({ ok: true });
}
