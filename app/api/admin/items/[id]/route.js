import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireAdmin } from '@/app/lib/auth';

export async function PATCH(_req, { params }) {
  try { requireAdmin(); } catch { return NextResponse.json({ error: 'forbidden' }, { status: 403 }); }
  const body = await _req.json();
  const data = {};
  if (body.name) data.name = String(body.name);
  if (body.tier) {
    const t = Number(body.tier) === 50 ? 'T50' : Number(body.tier) === 100 ? 'T100' : Number(body.tier) === 200 ? 'T200' : null;
    if (!t) return NextResponse.json({ error: 'tier must be 50/100/200' }, { status: 400 });
    data.tier = t;
  }
  if (typeof body.isActive === 'boolean') data.isActive = body.isActive;
  const item = await prisma.item.update({ where: { id: params.id }, data });
  return NextResponse.json(item);
}
