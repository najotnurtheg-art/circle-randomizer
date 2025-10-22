// app/api/admin/items/set-image-url/route.js
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireAdmin } from '@/app/lib/auth';

export async function POST(req) {
  try { requireAdmin(); }
  catch { return NextResponse.json({ error: 'forbidden' }, { status: 403 }); }

  // Parse body safely (avoid Unexpected end of JSON input)
  let body = {};
  try {
    const text = await req.text();
    body = text ? JSON.parse(text) : {};
  } catch {
    return NextResponse.json({ error: 'invalid json body' }, { status: 400 });
  }

  const id = String(body.id || '').trim();
  const imageUrl = body.imageUrl === null ? null : String(body.imageUrl || '').trim();

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  if (imageUrl && imageUrl.length > 2_000_000) {
    return NextResponse.json({ error: 'image too large' }, { status: 400 });
  }

  try {
    await prisma.item.update({
      where: { id },
      data: { imageUrl },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: `update failed: ${e?.message || e}` }, { status: 500 });
  }
}
