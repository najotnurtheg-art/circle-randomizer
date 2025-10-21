export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
// import { requireAdmin } from '@/app/lib/auth'; // add if you want to lock it

export async function GET() {
  // try { requireAdmin(); } catch { return NextResponse.json({ error: 'forbidden' }, { status: 403 }); }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, username: true, displayName: true, featured: true }
  });

  const ids = users.map(u => u.id);
  const wallets = await prisma.wallet.findMany({
    where: { userId: { in: ids } },
    select: { userId: true, balance: true }
  });
  const balById = new Map(wallets.map(w => [w.userId, Number(w.balance || 0)]));

  const out = users.map(u => ({
    id: u.id,
    displayName: u.displayName || u.username || 'User',
    balance: balById.get(u.id) ?? 0,
    featured: !!u.featured
  }));

  return NextResponse.json(out, { headers: { 'Cache-Control': 'no-store' } });
}
