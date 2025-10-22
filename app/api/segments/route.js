import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

/**
 * Builds segment list dynamically with weights
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const tier = Number(searchParams.get('tier')) || 50;

    const items = await prisma.item.findMany({
      where: { active: true },
      orderBy: { tier: 'asc' },
    });

    const segments = buildSegments(items, tier);
    return NextResponse.json({ segments });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to load segments' }, { status: 500 });
  }
}

/**
 * Builds weighted list for wheel:
 * 50 spin  = 10 normal / 3x / 5x etc
 * 100 spin = includes 200 / 50 items
 * 200 spin = includes 500 / 100 items
 */
function buildSegments(items, tier) {
  let segments = [];

  if (tier === 50) {
    const base = items.filter((i) => i.tier === 50);
    const hard = items.filter((i) => i.tier === 100).slice(0, 2);
    const coins = [{ type: 'coins', amount: 75 }];
    const spinAgain = [{ type: 'spin', name: 'Another spin' }];

    segments = [
      ...repeatWeighted(base, 10),
      ...repeatWeighted(hard, 3),
      ...repeatWeighted(coins, 5),
      ...repeatWeighted(spinAgain, 10),
    ];
  } else if (tier === 100) {
    const base = items.filter((i) => i.tier === 100);
    const harder = items.filter((i) => i.tier === 200).slice(0, 2);
    const lower = items.filter((i) => i.tier === 50).slice(0, 2);
    const coins = [{ type: 'coins', amount: 150 }];
    const spinAgain = [{ type: 'spin', name: 'Another spin' }];

    segments = [
      ...repeatWeighted(base, 10),
      ...repeatWeighted(harder, 3),
      ...repeatWeighted(lower, 3),
      ...repeatWeighted(coins, 5),
      ...repeatWeighted(spinAgain, 10),
    ];
  } else if (tier === 200) {
    const base = items.filter((i) => i.tier === 200);
    const rare = items.filter((i) => i.tier === 500).slice(0, 2);
    const lower = items.filter((i) => i.tier === 100).slice(0, 2);
    const coins = [{ type: 'coins', amount: 300 }];
    const spinAgain = [{ type: 'spin', name: 'Another spin' }];

    segments = [
      ...repeatWeighted(base, 10),
      ...repeatWeighted(rare, 2),
      ...repeatWeighted(lower, 5),
      ...repeatWeighted(coins, 3),
      ...repeatWeighted(spinAgain, 10),
    ];
  }

  // Shuffle
  return segments.sort(() => Math.random() - 0.5);
}

function repeatWeighted(arr, n) {
  const out = [];
  for (const i of arr) for (let j = 0; j < n; j++) out.push(i);
  return out;
}
