export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireAdmin } from '@/app/lib/auth';

const VALID_TIERS = new Set(['T50','T100','T200','T500']);

export async function PATCH(req, { params }) {
  try { requireAdmin(); } catch { return NextResponse.json({ error: 'forbidden' }, { status: 403 }); }

  const body = await req.json().catch(()=> ({}));
  const data = {};

  if (typeof body.purchasable === 'boolean') data.purchasable = body.purchasable;
  if (typeof body.isActive === 'boolean')     data.isActive = body.isActive;
  if (typeof body.name === 'string')          data.name = body.name.trim();
  if (typeof body.imageUrl === 'string')      data.imageUrl = body.imageUrl.trim();
  if (typeof body.tier === 'string') {
    if (!VALID_TIERS.has(body.tier)) {
      return NextResponse.json({ error: 'invalid tier' }, { status: 400 });
    }
    data.tier = body.tier;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'nothing to update' }, { status: 400 });
  }

  const it = await prisma.item.update({ where: { id: params.id }, data });
  return NextResponse.json(it, { headers: { 'Cache-Control': 'no-store' } });
}
