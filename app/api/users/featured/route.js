export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET() {
  // If you have a "featured" boolean on user, use it; otherwise show top balances.
  const users = await prisma.user.findMany({
    where: { featured: { equals: true } },
    orderBy: { displayName: 'asc' },
    select: { id:true, displayName:true, username:true, balance:true },
    take: 20,
  });

  const list = (users.length ? users : await prisma.user.findMany({
    orderBy: { balance: 'desc' },
    select: { id:true, displayName:true, username:true, balance:true },
    take: 20,
  })).map(u => ({
    id: u.id,
    displayName: u.displayName || u.username || 'User',
    balance: Number(u.balance || 0),
  }));

  return NextResponse.json(list, { headers: { 'Cache-Control': 'no-store' } });
}
