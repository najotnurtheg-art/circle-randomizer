// app/api/items/all/route.js
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET() {
  try {
    const items = await prisma.item.findMany({
      orderBy: [{ tier: 'asc' }, { createdAt: 'desc' }],
      select: { id: true, name: true, tier: true, imageUrl: true, isActive: true },
    });

    return NextResponse.json(items, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('items/all error', e);
    return NextResponse.json([], { headers: { 'Cache-Control': 'no-store' } });
  }
}
