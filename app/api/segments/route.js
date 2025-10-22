export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

// helper: enum ↔ number
const toEnum = (n) => (n === 50 ? 'T50' : n === 100 ? 'T100' : n === 200 ? 'T200' : 'T500');
const tierNum = (e) => (e === 'T50' ? 50 : e === 'T100' ? 100 : e === 'T200' ? 200 : 500);

// weights by “hardness”
const W = {
  normal: 10,
  harder2x: 5,
  harder3x: 3,
  harder5x: 2,
};

/**
 * Build segments according to the new rules.
 * Returned objects are JSON-safe and used by the client to render labels.
 * The actual winner is picked in /api/spin using the same builder (so both match).
 */
async function buildSegments(wager) {
  const T = toEnum(wager);

  // fetch active items, grouped by tier
  const [t50, t100, t200, t500] = await Promise.all([
    prisma.item.findMany({ where: { isActive: true, tier: 'T50' }, orderBy: { updatedAt: 'desc' } }),
    prisma.item.findMany({ where: { isActive: true, tier: 'T100' }, orderBy: { updatedAt: 'desc' } }),
    prisma.item.findMany({ where: { isActive: true, tier: 'T200' }, orderBy: { updatedAt: 'desc' } }),
    prisma.item.findMany({ where: { isActive: true, tier: 'T500' }, orderBy: { updatedAt: 'desc' } }),
  ]);

  const byTier = { T50: t50, T100: t100, T200: t200, T500: t500 };

  const segs = [];

  const addItem = (it, weight) => {
    segs.push({
      type: 'item',
      id: it.id,
      name: it.name,
      price: tierNum(it.tier),
      imageUrl: it.imageUrl || null,
      weight,
    });
  };

  const pickN = (arr, n) => {
    if (!arr.length) return [];
    const out = [];
    for (let i = 0; i < n; i++) out.push(arr[i % arr.length]); // cycle if not enough
    return out;
  };

  // rules per wager
  if (T === 'T50') {
    // All 50 items: normal
    byTier.T50.forEach((it) => addItem(it, W.normal));

    // 2 items from 100: 3x harder
    pickN(byTier.T100, 2).forEach((it) => addItem(it, W.harder3x));

    // +75 coins: 2x harder
    segs.push({ type: 'coins', amount: 75, weight: W.harder2x });

    // Another spin: normal
    segs.push({ type: 'again', weight: W.normal });
  }

  if (T === 'T100') {
    // All 100 items: normal
    byTier.T100.forEach((it) => addItem(it, W.normal));

    // 2 items from 200: 3x harder
    pickN(byTier.T200, 2).forEach((it) => addItem(it, W.harder3x));

    // 2 items from 50: 3x harder
    pickN(byTier.T50, 2).forEach((it) => addItem(it, W.harder3x));

    // +150 coins: 2x harder
    segs.push({ type: 'coins', amount: 150, weight: W.harder2x });

    // Another spin: normal
    segs.push({ type: 'again', weight: W.normal });
  }

  if (T === 'T200') {
    // All 200 items: normal
    byTier.T200.forEach((it) => addItem(it, W.normal));

    // 2 items from 500: 5x harder
    pickN(byTier.T500, 2).forEach((it) => addItem(it, W.harder5x));

    // 2 items from 100: 2x harder
    pickN(byTier.T100, 2).forEach((it) => addItem(it, W.harder2x));

    // +300 coins: 3x harder
    segs.push({ type: 'coins', amount: 300, weight: W.harder3x });

    // Another spin: normal
    segs.push({ type: 'again', weight: W.normal });
  }

  // Safety: ensure we always have at least 8 slices
  while (segs.length < 8) segs.push({ type: 'again', weight: W.normal });

  // sort a little so UI looks nicer (items first, then bonuses)
  const order = { item: 0, coins: 1, again: 2 };
  segs.sort((a, b) => order[a.type] - order[b.type]);

  // strip weight when sending to the client preview (spin API uses weights)
  const publicSegs = segs.map((s) =>
    s.type === 'item'
      ? { type: 'item', name: s.name, imageUrl: s.imageUrl ?? null }
      : s.type === 'coins'
      ? { type: 'coins', amount: s.amount }
      : { type: 'again' }
  );

  return { segs, publicSegs };
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const tier = Number(searchParams.get('tier') || '50');
    if (![50, 100, 200].includes(tier)) {
      return NextResponse.json({ error: 'bad tier' }, { status: 400 });
    }

    const { publicSegs } = await buildSegments(tier);
    return NextResponse.json({ segments: publicSegs }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('segments/', e);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}

// also export builder for /api/spin to reuse
export const _buildSegments = buildSegments;
export const _W = W;
