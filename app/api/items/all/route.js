export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

// Map the enum -> numeric tier the UI expects
const TIER_TO_NUM = {
  T50: 50,
  T100: 100,
  T200: 200,
  T500: 500,
};

export async function GET() {
  try {
    // Return *all* items (active or not) so the dropdown matches admin expectations
    // If you want only active, add: where: { isActive: true }
    const items = await prisma.item.findMany({
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    const out = items.map((it) => ({
      id: it.id,
      name: it.name,
      // IMPORTANT: normalize enum -> number to match wheel UI filtering
      tier: TIER_TO_NUM[it.tier] ?? null,
      isActive: it.isActive,
      purchasable: it.purchasable ?? false,
      imageUrl: it.imageUrl ?? null,
      createdAt: it.createdAt,
      updatedAt: it.updatedAt,
    }));

    return NextResponse.json(out, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('/api/items/all GET failed', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
