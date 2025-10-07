import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireAdmin } from '@/app/lib/auth';

const mapTier = (t) => {
  const n = Number(t);
  return n === 50 ? 'T50' : n === 100 ? 'T100' : n === 200 ? 'T200' : n === 500 ? 'T500' : null;
};

export async function PATCH(req, { params }) {
  try { requireAdmin(); } catch { return NextResponse.json({ error: 'forbidden' }, { status: 403 }); }
  const body = await req.json();
  const data = {};
  if (body.name) data.name = String(body.name);
  if (body.tier) {
    const t = mapTier(body.tier);
    if (!t) return NextResponse.json({ error: 'tier must be 50/100/200/500' }, { status: 400 });
    data.tier = t;
  }
  if (typeof body.isActive === 'boolean') data.isActive = body.isActive;
  if (typeof body.imageUrl === 'string') data.imageUrl = body.imageUrl;
  const item = await prisma.item.update({ where: { id: params.id }, data });
  return NextResponse.json(item);
}
