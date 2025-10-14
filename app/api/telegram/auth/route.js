import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { setToken } from '@/app/lib/auth';

function parseInitData(initData) {
  try {
    // initData is a querystring-like string from Telegram WebApp
    const params = new URLSearchParams(initData);
    const userJson = params.get('user');
    const authDate = Number(params.get('auth_date') || 0);
    return { user: JSON.parse(userJson || '{}'), authDate };
  } catch {
    return { user: null, authDate: 0 };
  }
}

export async function POST(req) {
  try {
    const { initData } = await req.json();
    if (!initData) return NextResponse.json({ error: 'no initData' }, { status: 400 });

    const { user, authDate } = parseInitData(initData);
    if (!user?.id || !authDate) {
      return NextResponse.json({ error: 'invalid telegram data' }, { status: 401 });
    }

    // (Optional) freshness check 10 minutes
    if (Date.now() / 1000 - authDate > 600) {
      return NextResponse.json({ error: 'stale telegram auth' }, { status: 401 });
    }

    const { id, username, first_name, last_name } = user;
    const displayName = [first_name, last_name].filter(Boolean).join(' ') || username || `u${id}`;

    const dbUser = await prisma.user.upsert({
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
      where: { userId: dbUser.id },
      update: {},
      create: { userId: dbUser.id, balance: 0 },
    });

    setToken({ sub: dbUser.id, role: dbUser.role });

    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'auth failed' }, { status: 500 });
  }
}
