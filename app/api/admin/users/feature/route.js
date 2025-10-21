export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireAdmin } from '@/app/lib/auth';

export async function POST(req) {
  try { requireAdmin(); } catch { return NextResponse.json({ error: 'forbidden' }, { status: 403 }); }

  const { userId, featured } = await req.json().catch(() => ({}));
  if (!userId || typeof featured !== 'boolean') {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  const u = await prisma.user.update({
    where: { id: userId },
    data: { featured },
    include: { wallet: true },
  });

  return NextResponse.json({
    id: u.id,
    username: u.username,
    displayName: u.displayName || u.username,
    featured: !!u.featured,
    balance: u.wallet?.balance ?? 0,
  });
}
