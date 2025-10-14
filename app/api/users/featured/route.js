export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET() {
  const users = await prisma.user.findMany({
    where: { featured: true },
    include: { wallet: true },
    orderBy: { createdAt: 'desc' },
    take: 200
  });

  const out = users.map(u => ({
    id: u.id,
    displayName: u.displayName || u.username,
    username: u.username,
    balance: u.wallet?.balance ?? 0
  }));

  return NextResponse.json(out, { headers: { 'Cache-Control': 'no-store' } });
}
