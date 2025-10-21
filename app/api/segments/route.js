// app/api/segments/route.js
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

// Map numeric tier → Prisma enum
const TIER = { 50: 'T50', 100: 'T100', 200: 'T200', 500: 'T500' };

/**
 * Build wheel segments for a wager, applying your "harder" rules:
 *
 * 50 spin
 *  - all T50 items: weight 1
 *  - two 100-coin rewards: 3x harder  → weight = 1/3
 *  - +75 coins: 2x harder            → weight = 1/2
 *  - another spin: normal            → weight = 1
 *
 * 100 spin
 *  - all T100 items: weight 1
 *  - two 200-coin rewards: 3x harder → weight = 1/3
 *  - two 50-coin rewards: 3x harder  → weight = 1/3
 *  - +150 coins: 2x harder           → weight = 1/2
 *  - another spin: normal            → weight = 1
 *
 * 200 spin
 *  - all T200 items: weight 1
 *  - two 500-coin rewards: 5x harder → weight = 1/5
 *  - two 100-coin rewards: 2x harder → weight = 1/2
 *  - +300 coins: 3x harder           → weight = 1/3
 *  - another spin: normal            → weight = 1
 */
function buildSegmentsBase(items, wager) {
  const segs = [];

  // All items for this tier at weight 1 (normal)
  for (const it of items) {
    segs.push({
      type: 'item',
      name: it.name,
      imageUrl: it.imageUrl || null,
      weight: 1,
    });
  }

  if (wager === 50) {
    // two x 100 coins @ 3x harder (1/3)
    segs.push({ type: 'coins', amount: 100, weight: 1 / 3 });
    segs.push({ type: 'coins', amount: 100, weight: 1 / 3 });
    // +75 @ 2x harder (1/2)
    segs.push({ type: 'coins', amount: 75, weight: 1 / 2 });
    // another spin normal
    segs.push({ type: 'again', weight: 1 });
  } else if (wager === 100) {
    // two x 200 coins @ 3x harder (1/3)
    segs.push({ type: 'coins', amount: 200, weight: 1 / 3 });
    segs.push({ type: 'coins', amount: 200, weight: 1 / 3 });
    // two x 50 coins @ 3x harder (1/3)
    segs.push({ type: 'coins', amount: 50, weight: 1 / 3 });
    segs.push({ type: 'coins', amount: 50, weight: 1 / 3 });
    // +150 @ 2x harder (1/2)
    segs.push({ type: 'coins', amount: 150, weight: 1 / 2 });
    // another spin normal
    segs.push({ type: 'again', weight: 1 });
  } else if (wager === 200) {
    // two x 500 coins @ 5x harder (1/5)
    segs.push({ type: 'coins', amount: 500, weight: 1 / 5 });
    segs.push({ type: 'coins', amount: 500, weight: 1 / 5 });
    // two x 100 coins @ 2x harder (1/2)
    segs.push({ type: 'coins', amount: 100, weight: 1 / 2 });
    segs.push({ type: 'coins', amount: 100, weight: 1 / 2 });
    // +300 @ 3x harder (1/3)
    segs.push({ type: 'coins', amount: 300, weight: 1 / 3 });
    // another spin normal
    segs.push({ type: 'again', weight: 1 });
  }

  return segs;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const tierNum = Number(searchParams.get('tier') || '50');
  const tierEnum = TIER[tierNum];

  if (!tierEnum) {
    return NextResponse.json({ error: 'invalid tier' }, { status: 400 });
  }

  // Load active items for this tier
  const items = await prisma.item.findMany({
    where: { isActive: true, tier: tierEnum },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, name: true, imageUrl: true },
  });

  const segments = buildSegmentsBase(items, tierNum);

  return NextResponse.json(
    { segments },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
