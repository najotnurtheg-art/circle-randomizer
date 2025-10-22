// app/api/spin/route.js
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getUser } from '@/app/lib/auth';
import { buildWheelFromItemsByTier } from '@/app/api/_lib/segments';

export async function POST(req) {
  try {
    const me = await getUser();
    const { wager } = await req.json();

    const W = Number(wager);
    if (![50, 100, 200].includes(W)) {
      return NextResponse.json({ error: 'bad_wager' }, { status: 400 });
    }

    // prevent overlap
    const current = await prisma.spinState.findUnique({ where: { id: 'global' } });
    if (current && current.status === 'SPINNING' && current.userId && current.userId !== me.sub) {
      return NextResponse.json({ error: 'busy' }, { status: 409 });
    }

    // balance check (do not debit here)
    const wallet = await prisma.wallet.upsert({
      where: { userId: me.sub },
      update: {},
      create: { userId: me.sub, balance: 0 },
    });
    if ((wallet.balance ?? 0) < W) {
      return NextResponse.json({ error: 'not_enough_coins' }, { status: 402 });
    }

    // build segments according to your rules
    const items = await prisma.item.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, tier: true, imageUrl: true },
    });
    const t50 = items.filter(i => i.tier === 'T50');
    const t100 = items.filter(i => i.tier === 'T100');
    const t200 = items.filter(i => i.tier === 'T200');
    const t500 = items.filter(i => i.tier === 'T500');

    const { segments, resultIndex, reward } =
      buildWheelFromItemsByTier({ t50, t100, t200, t500 }, W);

    const durationMs = 10000;
    const spinStartAt = new Date();

    await prisma.spinState.upsert({
      where: { id: 'global' },
      update: {
        status: 'SPINNING',
        userId: me.sub,
        username: me.name || me.username || me.sub,
        wager: W,
        segments,
        resultIndex,
        spinStartAt,
        durationMs,
        pendingReward: reward,
      },
      create: {
        id: 'global',
        status: 'SPINNING',
        userId: me.sub,
        username: me.name || me.username || me.sub,
        wager: W,
        segments,
        resultIndex,
        spinStartAt,
        durationMs,
        pendingReward: reward,
      },
    });

    return NextResponse.json({
      status: 'SPINNING',
      userId: me.sub,
      username: me.name || me.username || me.sub,
      wager: W,
      segments,
      resultIndex,
      spinStartAt,
      durationMs,
    });

  } catch (e) {
    console.error('spin start error', e);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
