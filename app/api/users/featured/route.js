export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET() {
  const users = await prisma.user.findMany({
    where: { featured: true },
    orderBy: { displayName: 'asc' },
    select: { id: true, displayName: true, username: true },
  });

  const userIds = users.map(u => u.id);
  const wallets = await prisma.wallet.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, balance: true },
  });
  const byUser = new Map(wallets.map(w => [w.userId, Number(w.balance || 0)]));

  const out = users.map(u => ({
    id: u.id,
    displayName: u.displayName || u.username || 'User',
    balance: byUser.get(u.id) ?? 0,
  }));

  return NextResponse.json(out, { headers: { 'Cache-Control': 'no-store' } });
}
