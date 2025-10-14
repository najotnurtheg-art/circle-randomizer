export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { setToken } from '@/app/lib/auth';
import { verifyTelegramInitData, getTelegramUser, isFresh } from '@/app/lib/telegram';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

function buildDisplayName(tgUser) {
  const first = (tgUser.first_name || '').trim();
  const last  = (tgUser.last_name || '').trim();
  const uname = (tgUser.username || '').trim();
  if (first || last) return `${first} ${last}`.trim();
  if (uname) return uname;
  return `User ${tgUser.id}`;
}

export async function POST(req) {
  const { initData } = await req.json().catch(() => ({}));
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!initData || !botToken) {
    return NextResponse.json({ error: 'missing initData or token' }, { status: 400 });
  }

  const ok = verifyTelegramInitData(initData, botToken);
  if (!ok) return NextResponse.json({ error: 'bad signature' }, { status: 401 });
  if (!isFresh(initData, 600)) return NextResponse.json({ error: 'stale auth' }, { status: 401 });

  const tgUser = getTelegramUser(initData);
  if (!tgUser || !tgUser.id) return NextResponse.json({ error: 'no user' }, { status: 400 });

  const username = tgUser.username
    ? `tg_${tgUser.id}_${tgUser.username}`
    : `tg_${tgUser.id}`;

  const pretty = buildDisplayName(tgUser);

  let user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    const randomPwd = crypto.randomBytes(16).toString('hex');
    const hash = await bcrypt.hash(randomPwd, 10);
    user = await prisma.user.create({
      data: { username, displayName: pretty, password: hash }
    });
    await prisma.wallet.create({ data: { userId: user.id } });
  } else if (!user.displayName) {
    // If admin hasn't set a displayName yet, fill it once
    user = await prisma.user.update({
      where: { id: user.id },
      data: { displayName: pretty }
    });
  }

  setToken({ sub: user.id, role: user.role, username: user.username });
  return NextResponse.json({ ok: true });
}
