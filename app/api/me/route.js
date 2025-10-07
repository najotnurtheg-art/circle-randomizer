export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getUser } from '@/app/lib/auth';

export async function GET() {
  const u = getUser();
  if (!u) return NextResponse.json({ error: 'unauth' }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { id: u.sub } });
  const wallet = await prisma.wallet.findUnique({ where: { userId: u.sub } });

  return NextResponse.json({
    id: dbUser.id,
    username: dbUser.username,
    displayName: dbUser.displayName || dbUser.username,
    role: dbUser.role,
    balance: wallet?.balance ?? 0
  }, { headers: { 'Cache-Control': 'no-store' } });
}
