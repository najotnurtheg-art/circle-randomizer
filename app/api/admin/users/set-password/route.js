// app/api/admin/users/set-password/route.js
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireAdmin } from '@/app/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(req) {
  try { requireAdmin(); } catch { return NextResponse.json({ error: 'forbidden' }, { status: 403 }); }

  try {
    const { userId, password } = await req.json();
    if (!userId || !password || String(password).length < 4) {
      return NextResponse.json({ error: 'bad_request' }, { status: 400 });
    }

    const hash = await bcrypt.hash(String(password), 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hash },
    });

    // Return the clear password ONCE (do NOT store it anywhere!)
    return NextResponse.json({ ok: true, shownOncePassword: String(password) });
  } catch (e) {
    console.error('admin set-password error', e);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
