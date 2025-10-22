// app/api/spin/complete/route.js
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getUser } from '@/app/lib/auth';

export async function POST() {
  try {
    const me = await getUser();

    // Load current spin state
    const s = await prisma.spinState.findUnique({ where: { id: 'global' } });

    // Nothing to complete
    if (!s || s.status !== 'SPINNING' || !s.spinStartAt) {
      return NextResponse.json({ ok: true, message: 'no_active_spin' });
    }

    // Only the spinner can complete before it naturally expires
    const hasExpired =
      Date.now() >= new Date(s.spinStartAt).getTime() + Number(s.durationMs || 0);

    if (s.userId && s.userId !== me.sub && !hasExpired) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const reward = s.pendingReward || null;
    const targetUserId = s.userId || me.sub; // just in case
    const username = s.username || 'Guest';
    const wager = Number(s.wager || 0);

    let popup = null;

    if (reward && reward.type === 'coins') {
      // Upsert wallet and add coins
      const w = await prisma.wallet.upsert({
        where: { userId: targetUserId },
        update: {},
        create: { userId: targetUserId, balance: 0 },
      });

      await prisma.wallet.update({
        where: { id: w.id },
        data: { balance: { increment: Number(reward.amount || 0) } },
      });

      popup = {
        text: `'${username}' siz +${reward.amount} tangalarni yutib oldingiz🎉`,
        imageUrl: null,
      };

      await prisma.spinLog.create({
        data: {
          userId: targetUserId,
          username,
          wager,
          prize: `+${reward.amount} coins`,
        },
      });
    } else if (reward && reward.type === 'item') {
      // Log item reward
      popup = {
        text: `'${username}' siz '${reward.name}' yutib oldingiz🎉`,
        imageUrl: reward.imageUrl || null,
      };

      await prisma.spinLog.create({
        data: {
          userId: targetUserId,
          username,
          wager,
          prize: reward.name || 'Prize',
        },
      });
    } else {
      // Respin / fallback
      popup = { text: `'${username}' uchun yana bir aylantirish!`, imageUrl: null };

      await prisma.spinLog.create({
        data: {
          userId: targetUserId,
          username,
          wager,
          prize: 'Another spin',
        },
      });
    }

    // Reset global spin state
    await prisma.spinState.update({
      where: { id: 'global' },
      data: {
        status: 'IDLE',
        userId: null,
        username: null,
        wager: null,
        segments: [],
        resultIndex: null,
        spinStartAt: null,
        durationMs: null,
        pendingReward: null,
      },
    });

    return NextResponse.json({ ok: true, popup });
  } catch (err) {
    console.error('spin complete error', err);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
