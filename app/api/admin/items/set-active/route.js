// app/api/admin/items/set-active/route.js
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireAdmin } from '@/app/lib/auth';

export async function POST(req) {
  try { requireAdmin(); }
  catch { return NextResponse.json({ error: 'forbidden' }, { status: 403 }); }

  let body = {};
  try {
    const t = await req.text();
    body = t ? JSON.parse(t) : {};
  } catch {
    return NextResponse.json({ error: 'invalid json body' }, { status: 400 });
  }

  const id = String(body.id || '').trim();
  const isActive = Boolean(body.isActive);

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  try {
    await prisma.item.update({ where: { id }, data: { isActive } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: `update failed: ${e?.message || e}` }, { status: 500 });
  }
}
