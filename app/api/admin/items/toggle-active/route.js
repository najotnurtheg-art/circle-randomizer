// app/api/admin/items/toggle-active/route.js
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireAdmin } from '@/app/lib/auth';

export async function POST(req) {
  try { requireAdmin(); } catch { return NextResponse.json({ error: 'forbidden' }, { status: 403 }); }

  try {
    const { id, active } = await req.json();
    if (!id || typeof active !== 'boolean') {
      return NextResponse.json({ error: 'bad_request' }, { status: 400 });
    }

    const item = await prisma.item.update({
      where: { id },
      data: { isActive: active },
      select: { id: true, isActive: true },
    });

    return NextResponse.json(item);
  } catch (e) {
    console.error('toggle-active error', e);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
