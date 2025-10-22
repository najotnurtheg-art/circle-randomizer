// app/api/admin/items/route.js
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireAdmin } from '@/app/lib/auth';

// map number -> Prisma enum
const TIER_ENUM = { 50: 'T50', 100: 'T100', 200: 'T200', 500: 'T500' };

export async function GET() {
  try { requireAdmin(); }
  catch { return NextResponse.json({ error: 'forbidden' }, { status: 403 }); }

  try {
    const items = await prisma.item.findMany({
      orderBy: { updatedAt: 'desc' },
      select: { id:true, name:true, tier:true, isActive:true, imageUrl:true, purchasable:true, updatedAt:true },
    });
    return NextResponse.json(items, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return NextResponse.json({ error: `load failed: ${e?.message || e}` }, { status: 500 });
  }
}

export async function POST(req) {
  try { requireAdmin(); }
  catch { return NextResponse.json({ error: 'forbidden' }, { status: 403 }); }

  // Be tolerant: parse body safely even if empty
  let body = {};
  try {
    const text = await req.text();
    body = text ? JSON.parse(text) : {};
  } catch {
    return NextResponse.json({ error: 'invalid json body' }, { status: 400 });
  }

  const rawName = (body.name || '').toString().trim();
  const tierNum = Number(body.tier);
  const imageUrl = body.imageUrl ? String(body.imageUrl) : null;
  const tierEnum = TIER_ENUM[tierNum];

  if (!rawName) return NextResponse.json({ error: 'name required' }, { status: 400 });
  if (!tierEnum) return NextResponse.json({ error: 'invalid tier' }, { status: 400 });

  try {
    const created = await prisma.item.create({
      data: {
        name: rawName,
        tier: tierEnum,
        imageUrl,
        isActive: true,
        purchasable: false,
      },
      select: { id:true, name:true, tier:true, isActive:true, imageUrl:true, purchasable:true },
    });
    return NextResponse.json({ ok: true, item: created });
  } catch (e) {
    return NextResponse.json({ error: `add failed: ${e?.message || e}` }, { status: 500 });
  }
}
