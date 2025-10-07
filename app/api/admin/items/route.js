import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireAdmin } from '@/app/lib/auth';

const mapTier = (t) => {
  const n = Number(t);
  return n === 50 ? 'T50' : n === 100 ? 'T100' : n === 200 ? 'T200' : n === 500 ? 'T500' : null;
};

export async function GET() {
  try { requireAdmin(); } catch { return NextResponse.json({ error: 'forbidden' }, { status: 403 }); }
  const items = await prisma.item.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(items);
}

export async function POST(req) {
  try { requireAdmin(); } catch { return NextResponse.json({ error: 'forbidden' }, { status: 403 }); }
  const { name, tier, imageUrl } = await req.json();
  if (!name || !tier) return NextResponse.json({ error: 'missing' }, { status: 400 });
  const t = mapTier(tier);
  if (!t) return NextResponse.json({ error: 'tier must be 50/100/200/500' }, { status: 400 });
  const item = await prisma.item.create({ data: { name, tier: t, imageUrl } });
  return NextResponse.json(item);
}
