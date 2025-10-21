// app/api/segments/route.js
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

// Prisma enum map
const TIER = { 50: 'T50', 100: 'T100', 200: 'T200', 500: 'T500' };

// Integer weights (no fractions)
const W_HARDEST = 1;   // "×N harder" → use 1
const W_NORMAL  = 3;   // normal baseline
const W_AGAIN   = 3;   // "Another spin" is normal

function cyclePick(arr, n) {
  const out = [];
  if (arr.length === 0) return out;
  for (let i = 0; i < n; i++) out.push(arr[i % arr.length]);
  return out;
}

function buildSegments({ items50, items100, items200, items500 }, wager) {
  const segs = [];

  if (wager === 50) {
    // All 50-tier items: normal
    for (const it of items50) segs.push({ type:'item', name: it.name, imageUrl: it.imageUrl || null, weight: W_NORMAL });

    // Two 100-tier items: 3× harder → weight = 1
    for (const it of cyclePick(items100, 2)) segs.push({ type:'item', name: it.name, imageUrl: it.imageUrl || null, weight: W_HARDEST });

    // +75 coins: 2× harder (we still map to hardest int = 1)
    segs.push({ type:'coins', amount: 75, weight: W_HARDEST });

    // Another spin: normal
    segs.push({ type:'again', weight: W_AGAIN });
  }

  if (wager === 100) {
    // All 100-tier items: normal
    for (const it of items100) segs.push({ type:'item', name: it.name, imageUrl: it.imageUrl || null, weight: W_NORMAL });

    // Two 200-tier items: 3× harder → weight 1
    for (const it of cyclePick(items200, 2)) segs.push({ type:'item', name: it.name, imageUrl: it.imageUrl || null, weight: W_HARDEST });

    // Two 50-tier items: 3× harder → weight 1
    for (const it of cyclePick(items50, 2))  segs.push({ type:'item', name: it.name, imageUrl: it.imageUrl || null, weight: W_HARDEST });

    // +150 coins: 2× harder → weight 1
    segs.push({ type:'coins', amount: 150, weight: W_HARDEST });

    // Another spin: normal
    segs.push({ type:'again', weight: W_AGAIN });
  }

  if (wager === 200) {
    // All 200-tier items: normal
    for (const it of items200) segs.push({ type:'item', name: it.name, imageUrl: it.imageUrl || null, weight: W_NORMAL });

    // Two 500-tier items: 5× harder → weight 1
    for (const it of cyclePick(items500, 2)) segs.push({ type:'item', name: it.name, imageUrl: it.imageUrl || null, weight: W_HARDEST });

    // Two 100-tier items: 2× harder → (map to hardest int) 1
    for (const it of cyclePick(items100, 2)) segs.push({ type:'item', name: it.name, imageUrl: it.imageUrl || null, weight: W_HARDEST });

    // +300 coins: 3× harder → weight 1
    segs.push({ type:'coins', amount: 300, weight: W_HARDEST });

    // Another spin: normal
    segs.push({ type:'again', weight: W_AGAIN });
  }

  return segs;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const tier = Number(searchParams.get('tier') || '50');
  if (![50,100,200].includes(tier)) {
    return NextResponse.json({ error: 'invalid tier' }, { status: 400 });
  }

  // Load active items from all tiers we might reference
  const [items50, items100, items200, items500] = await Promise.all([
    prisma.item.findMany({ where:{ isActive:true, tier:'T50'  }, select:{ name:true, imageUrl:true }}),
    prisma.item.findMany({ where:{ isActive:true, tier:'T100' }, select:{ name:true, imageUrl:true }}),
    prisma.item.findMany({ where:{ isActive:true, tier:'T200' }, select:{ name:true, imageUrl:true }}),
    prisma.item.findMany({ where:{ isActive:true, tier:'T500' }, select:{ name:true, imageUrl:true }}),
  ]);

  const segments = buildSegments({ items50, items100, items200, items500 }, tier);

  return NextResponse.json({ segments }, { headers: { 'Cache-Control': 'no-store' } });
}
