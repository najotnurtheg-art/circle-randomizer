import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getUser } from '@/app/lib/auth';

export async function GET() {
  const u = getUser();
  if (!u) return NextResponse.json({ error: 'unauth' }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: u.sub }, include: { wallet: true } });
  return NextResponse.json({ id: user.id, username: user.username, role: user.role, balance: user.wallet?.balance ?? 0 });
}
