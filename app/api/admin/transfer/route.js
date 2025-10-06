import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireAdmin } from '@/app/lib/auth';

export async function POST(req) {
  try { requireAdmin(); } catch { return NextResponse.json({ error: 'forbidden' }, { status: 403 }); }
  const { toUsername, amount } = await req.json();
  const to = await prisma.user.findUnique({ where: { username: String(toUsername) } });
  if (!to) return NextResponse.json({ error: 'no user' }, { status: 400 });
  const amt = Number(amount) || 0; if (amt <= 0) return NextResponse.json({ error: 'amount>0' }, { status: 400 });
  await prisma.wallet.upsert({
    where: { userId: to.id },
    create: { userId: to.id, balance: amt },
    update: { balance: { increment: amt } }
  });
  return NextResponse.json({ ok: true });
}
