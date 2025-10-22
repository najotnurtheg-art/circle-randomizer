// app/api/segments/route.js
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { buildWheelFromItemsByTier } from '@/app/api/_lib/segments';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const tier = Number(searchParams.get('tier') || '50');

    const items = await prisma.item.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, tier: true, imageUrl: true },
    });

    const t50 = items.filter(i => i.tier === 'T50');
    const t100 = items.filter(i => i.tier === 'T100');
    const t200 = items.filter(i => i.tier === 'T200');
    const t500 = items.filter(i => i.tier === 'T500');

    const { segments } = buildWheelFromItemsByTier({ t50, t100, t200, t500 }, tier);
    return NextResponse.json({ segments });

  } catch (e) {
    console.error('segments error', e);
    return NextResponse.json({ segments: [] }, { status: 200 });
  }
}
