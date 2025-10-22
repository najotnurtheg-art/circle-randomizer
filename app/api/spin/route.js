export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getUser } from '@/app/lib/auth';

/**
 * Build the wheel segments for a given wager.
 * Keep this simple to unblock spinning; you can refine weights later.
 * Segments are rendered exactly as returned here on the client.
 */
async function buildSegments(wager) {
  // Items by tier
  const tierMap = { 50: 'T50', 100: 'T100', 200: 'T200', 500: 'T500' };

  const items = await prisma.item.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
    take: 1000
  });

  const thisTier = tierMap[wager];
  if (!thisTier) return [];

  const segs = [];

  // 1) all items of the selected tier
  for (const it of items.filter(i => i.tier === thisTier)) {
    segs.push({ type: 'item', id: it.id, name: it.name, imageUrl: it.imageUrl ?? null });
  }

  // 2) one "Another spin"
  segs.push({ type: 'respins', label: 'Another spin' });

  // 3) a coins segment (75/150/300 depending on wager)
  const coinByWager = { 50: 75, 100: 150, 200: 300 };
  const add = coinByWager[wager] ?? 0;
  if (add > 0) segs.push({ type: 'coins', amount: add });

  // If segs too small, duplicate safe entries so the wheel can draw
  while (segs.length < 6) {
    segs.push({ type: 'respins', label: 'Another spin' });
  }

  return segs;
}

export async function POST(req) {
  try {
    const me = await getUser();
    if (!me) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const { wager } = await req.json().catch(() => ({}));
    const w = Number(wager);
    if (![50, 100, 200].includes(w)) {
      return NextResponse.json({ error: 'invalid_wager' }, { status: 400 });
    }

    // Load or init global spin state
    let s = await prisma.spinState.findUnique({ where: { id: 'global' } });
    if (!s) {
      s = await prisma.spinState.create({ data: { id: 'global', status: 'IDLE' } });
    }

    // If someone else is spinning — block
    if (s.status === 'SPINNING' && s.userId && s.userId !== me.sub) {
      return NextResponse.json({ error: 'busy', username: s.username || 'other' }, { status: 409 });
    }

    // Check balance
    const wallet = await prisma.wallet.upsert({
      where: { userId: me.sub },
      update: {},
      create: { userId: me.sub, balance: 0 }
    });

    if ((wallet.balance ?? 0) < w) {
      return NextResponse.json({ error: 'not_enough_coins', balance: wallet.balance ?? 0 }, { status: 400 });
    }

    // Build segments & pick a result (simple uniform pick to unblock)
    const segments = await buildSegments(w);
    if (segments.length === 0) return NextResponse.json({ error: 'no_segments' }, { status: 400 });

    const resultIndex = Math.floor(Math.random() * segments.length);
    const resultSeg = segments[resultIndex];

    // Determine pending reward (only coins or item; respin → 0 for now)
    let pendingReward = null;
    if (resultSeg.type === 'coins') {
      pendingReward = { type: 'coins', amount: Number(resultSeg.amount) || 0 };
    } else if (resultSeg.type === 'item') {
      pendingReward = { type: 'item', itemId: resultSeg.id, name: resultSeg.name || '' };
    } else {
      pendingReward = { type: 'none' }; // respin segment
    }

    // Deduct wager immediately
    await prisma.wallet.update({
      where: { userId: me.sub },
      data: { balance: { decrement: w } }
    });

    const now = new Date();
    const durationMs = 10000; // 10s animation

    // Set global spin lock/state
    const updated = await prisma.spinState.update({
      where: { id: 'global' },
      data: {
        status: 'SPINNING',
        userId: me.sub,
        username: me.displayName || me.username || 'player',
        wager: w,
        segments,
        resultIndex,
        spinStartAt: now,
        durationMs,
        // store pending reward (applied by /complete)
        // Prisma Json type:
        // @ts-ignore
        pendingReward
      }
    });

    // Send everything needed for all clients to animate the same result
    return NextResponse.json({
      status: updated.status,
      userId: updated.userId,
      username: updated.username,
      wager: updated.wager,
      segments: updated.segments,
      resultIndex: updated.resultIndex,
      spinStartAt: updated.spinStartAt,
      durationMs: updated.durationMs
    }, { headers: { 'Cache-Control': 'no-store' } });

  } catch (e) {
    console.error('spin POST error', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
