// app/api/admin/items/set-image-url/route.js
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireAdmin } from '@/app/lib/auth';

export async function POST(req) {
  try {
    requireAdmin();
    const { id, imageUrl } = await req.json();
    if (!id) return NextResponse.json({ error:'bad_request' }, { status:400 });
    const updated = await prisma.item.update({
      where:{ id }, data:{ imageUrl: imageUrl || null }
    });
    return NextResponse.json({ ok:true, item: updated });
  } catch (e) {
    console.error('set-image-url error', e);
    return NextResponse.json({ error:'server' }, { status:500 });
  }
}
