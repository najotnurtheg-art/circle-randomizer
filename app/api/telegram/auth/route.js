import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { setToken } from '@/app/lib/auth';
import { isTelegramAuthValid, isFresh } from '@/app/lib/telegram';

export async function POST(req) {
  try {
    const body = await req.json();
    if (!isTelegramAuthValid(body) || !isFresh(body, 600)) {
      return NextResponse.json({ error: 'invalid telegram auth' }, { status: 401 });
    }

    const { id, username, first_name, last_name } = body.user || {};
    if (!id) return NextResponse.json({ error: 'no user' }, { status: 400 });

    const displayName = [first_name, last_name].filter(Boolean).join(' ') || username || `u${id}`;

    const user = await prisma.user.upsert({
      where: { tgId: String(id) },
      update: { username: username || null, displayName },
      create: {
        tgId: String(id),
        username: username || null,
        displayName,
        role: 'USER',
      },
    });

    await prisma.wallet.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, balance: 0 },
    });

    setToken({ sub: user.id, role: user.role });

    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'auth failed' }, { status: 500 });
  }
}
