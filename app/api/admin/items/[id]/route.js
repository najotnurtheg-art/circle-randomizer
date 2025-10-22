export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireAdmin } from '@/app/lib/auth';

/**
 * PATCH: partial update
 *  - name?: string
 *  - tier?: 'T50'|'T100'|'T200'|'T500'
 *  - isActive?: boolean
 *  - purchasable?: boolean
 *  - imageUrl?: string|null
 *
 * DELETE: delete item
 */

export async function PATCH(_req, { params }) {
  try { requireAdmin(); } catch { return NextResponse.json({ error: 'forbidden' }, { status: 403 }); }
  const id = params?.id;
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

  const body = await _req.json().catch(() => ({}));
  const { name, tier, isActive, purchasable, imageUrl } = body || {};
  const data = {};

  if (typeof name === 'string') data.name = name;
  if (['T50', 'T100', 'T200', 'T500'].includes(tier)) data.tier = tier;
  if (typeof isActive === 'boolean') data.isActive = isActive;
  if (typeof purchasable === 'boolean') data.purchasable = purchasable;
  if (typeof imageUrl === 'string' || imageUrl === null) data.imageUrl = imageUrl;

  const updated = await prisma.item.update({
    where: { id },
    data,
  });

  return NextResponse.json(updated, { headers: { 'Cache-Control': 'no-store' } });
}

export async function DELETE(_req, { params }) {
  try { requireAdmin(); } catch { return NextResponse.json({ error: 'forbidden' }, { status: 403 }); }
  const id = params?.id;
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 });

  await prisma.item.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
