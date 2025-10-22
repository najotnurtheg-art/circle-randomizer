export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getUser } from '@/app/lib/auth';

/** Build simple segments for the selected wager (unblocks spinning). */
async function buildSegments(wager) {
  const tierMap = { 50: 'T50', 100: 'T100', 200: 'T200', 500: 'T500' };

  const items = await prisma.item.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
    take: 1000,
  });

  const thisTier = tierMap[wager];
  if (!thisTier) return [];

  const segs = [];

  // 1) all items of this wager tier
  for (const it of items.filter((i) => i.tier === thisTier)) {
    segs.push({ type: 'item', id: it.id, name: it.name, imageUrl: it.imageUrl ?? null });
  }

  // 2) one "Another spin"
  segs.push({ type: 'respin', label: 'Another spin' });

  // 3) a coins segment (75/150/300)
  const coinByWager = { 50: 75, 100: 150, 200: 300 };
  const add = coinByWager[wager] ?? 0;
  if (add > 0) segs.push({ type: 'coins', amount: add });

  // Ensure at least a few segments exist so the wheel can render
  while (segs.length < 6) segs.push({ type: 'respin', label: 'Another spin' });

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

    // Load or init global lock
    let s = await prisma.spinState.findUnique({ where: { id: 'global' } });
    if (!s) s = await prisma.spinState.create({ data: { id: 'global', status: 'IDLE' } });

    // Someone else spinning?
    if (s.status === 'SPINNING' && s.userId && s.userId !== me.sub) {
      return NextResponse.json({ error: 'busy', username: s.username || 'other' }, { status: 409 });
    }

    // Balance check
    const wallet = await prisma.wallet.upsert({
      where: { userId: me.sub },
      update: {},
      create: { userId: me.sub, balance: 0 },
    });
    if ((wallet.balance ?? 0) < w) {
      return NextResponse.json({ error: 'not_enough_coins', balance: wallet.balance ?? 0 }, { status: 400 });
    }

    // Build segments and choose random result
    const segments = await buildSegments(w);
    if (!segments.length) return NextResponse.json({ error: 'no_segments' }, { status: 400 });

    const resultIndex = Math.floor(Math.random() * segments.length);

    // Deduct wager now
    await prisma.wallet.update({
      where: { userId: me.sub },
      data: { balance: { decrement: w } },
    });

    // Save shared state for all clients
    const now = new Date();
    const durationMs = 10000; // 10s animation
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
      },
    });

    return NextResponse.json(
      {
        status: updated.status,
        userId: updated.userId,
        username: updated.username,
        wager: updated.wager,
        segments: updated.segments,
        resultIndex: updated.resultIndex,
        spinStartAt: updated.spinStartAt,
        durationMs: updated.durationMs,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e) {
    console.error('spin POST error', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
