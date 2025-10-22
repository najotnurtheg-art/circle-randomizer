// app/api/admin/items/toggle/route.js
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireAdmin } from '@/app/lib/auth';

export async function POST(req) {
  try {
    requireAdmin();
    const { id, field } = await req.json();
    if (!id || !['isActive','purchasable'].includes(field)) {
      return NextResponse.json({ error:'bad_request' }, { status:400 });
    }
    const item = await prisma.item.findUnique({ where:{ id } });
    if (!item) return NextResponse.json({ error:'not_found' }, { status:404 });

    const updated = await prisma.item.update({
      where:{ id },
      data:{ [field]: !item[field] }
    });
    return NextResponse.json({ ok:true, item: updated });
  } catch (e) {
    console.error('toggle item failed', e);
    return NextResponse.json({ error:'server' }, { status:500 });
  }
}
