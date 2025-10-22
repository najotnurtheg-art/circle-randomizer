export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireAdmin } from '@/app/lib/auth';

/**
 * GET: list items (admin)
 * POST: create item (name, tier, isActive, purchasable, imageUrl?)
 */

export async function GET() {
  try { requireAdmin(); } catch { return NextResponse.json({ error: 'forbidden' }, { status: 403 }); }

  const items = await prisma.item.findMany({
    orderBy: { createdAt: 'desc' },
    take: 1000,
  });

  return NextResponse.json(items, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req) {
  try { requireAdmin(); } catch { return NextResponse.json({ error: 'forbidden' }, { status: 403 }); }

  const body = await req.json().catch(() => ({}));
  const { name, tier, isActive = true, purchasable = false, imageUrl = null } = body || {};

  const allowed = ['T50', 'T100', 'T200', 'T500'];
  if (!name || !allowed.includes(tier)) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }

  const it = await prisma.item.create({
    data: { name, tier, isActive: !!isActive, purchasable: !!purchasable, imageUrl },
  });

  return NextResponse.json(it, { status: 201 });
}
