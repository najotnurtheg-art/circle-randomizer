export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET() {
  const list = await prisma.user.findMany({
    where: { featured: true },
    orderBy: { displayName: 'asc' },
    select: { id:true, displayName:true, username:true, balance:true }
  });

  const out = list.map(u => ({
    id: u.id,
    displayName: u.displayName || u.username || 'User',
    balance: Number(u.balance || 0),
  }));

  return NextResponse.json(out, { headers:{ 'Cache-Control':'no-store' }});
}
