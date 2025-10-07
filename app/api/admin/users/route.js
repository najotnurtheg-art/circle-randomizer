export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireAdmin } from '@/app/lib/auth';

export async function GET() {
  try { requireAdmin(); } catch { return NextResponse.json({ error: 'forbidden' }, { status: 403 }); }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    include: { wallet: true },
    take: 500,
  });

  const out = users.map(u => ({
    id: u.id,
    username: u.username,
    displayName: u.displayName || u.username,  // show pretty name
    role: u.role,
    balance: u.wallet?.balance ?? 0,
    createdAt: u.createdAt,
  }));

  return NextResponse.json(out, { headers: { 'Cache-Control': 'no-store' } });
}
