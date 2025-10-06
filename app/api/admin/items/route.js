import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireAdmin } from '@/app/lib/auth';

export async function GET() {
  try { requireAdmin(); } catch { return NextResponse.json({ error: 'forbidden' }, { status: 403 }); }
  const items = await prisma.item.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(items);
}

export async function POST(req) {
  try { requireAdmin(); } catch { return NextResponse.json({ error: 'forbidden' }, { status: 403 }); }
  const { name, tier } = await req.json();
  if (!name || !tier) return NextResponse.json({ error: 'missing' }, { status: 400 });
  const t = tier === 50 ? 'T50' : tier === 100 ? 'T100' : tier === 200 ? 'T200' : null;
  if (!t) return NextResponse.json({ error: 'tier must be 50/100/200' }, { status: 400 });
  const item = await prisma.item.create({ data: { name, tier: t } });
  return NextResponse.json(item);
}
