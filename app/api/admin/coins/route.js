export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireAdmin } from '@/app/lib/auth';

export async function POST(req) {
  try { requireAdmin(); } catch { return NextResponse.json({ error: 'forbidden' }, { status: 403 }); }

  const { userId, amount, username } = await req.json().catch(()=> ({}));
  const val = Number(amount);

  if (!Number.isFinite(val) || !Number.isInteger(val)) {
    return NextResponse.json({ error: 'amount must be an integer' }, { status: 400 });
  }
  if (val <= 0) {
    return NextResponse.json({ error: 'amount must be > 0' }, { status: 400 });
  }

  let user = null;
  if (userId) {
    user = await prisma.user.findUnique({ where: { id: String(userId) } });
  } else if (username) {
    user = await prisma.user.findUnique({ where: { username: String(username) } });
  } else {
    return NextResponse.json({ error: 'userId or username required' }, { status: 400 });
  }

  if (!user) return NextResponse.json({ error: 'user not found' }, { status: 404 });

  const wallet = await prisma.wallet.upsert({
    where: { userId: user.id },
    update: { balance: { increment: val } },
    create: { userId: user.id, balance: val }
  });

  return NextResponse.json({ ok: true, username: user.username, userId: user.id, balance: wallet.balance });
}
