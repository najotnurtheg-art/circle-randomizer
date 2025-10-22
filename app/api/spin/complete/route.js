// app/api/spin/complete/route.js
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getUser } from '@/app/lib/auth';

export async function POST() {
  try {
    const me = await getUser();

    const s = await prisma.spinState.findUnique({ where: { id: 'global' } });
    if (!s || s.status !== 'SPINNING' || !s.spinStartAt) {
      return NextResponse.json({ ok: true, message: 'no_active_spin' });
    }

    const hasExpired =
      Date.now() >= new Date(s.spinStartAt).getTime() + Number(s.durationMs || 0);

    if (s.userId && s.userId !== me.sub && !hasExpired) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const reward = s.pendingReward || null;
    const targetUserId = s.userId || me.sub;
    const username = s.username || 'User';
    const wager = Number(s.wager || 0);

    // Single transaction: charge the spin and apply reward
    await prisma.$transaction(async (tx) => {
      // ensure wallet exists
      const w = await tx.wallet.upsert({
        where: { userId: targetUserId },
        update: {},
        create: { userId: targetUserId, balance: 0 },
      });

      // charge the spin
      await tx.wallet.update({
        where: { id: w.id },
        data: { balance: { decrement: wager } },
      });

      // apply reward
      if (reward && reward.type === 'coins') {
        await tx.wallet.update({
          where: { id: w.id },
          data: { balance: { increment: Number(reward.amount || 0) } },
        });

        await tx.spinLog.create({
          data: {
            userId: targetUserId,
            username,
            wager,
            prize: `+${reward.amount} coins`,
          },
        });
      } else if (reward && reward.type === 'item') {
        await tx.spinLog.create({
          data: {
            userId: targetUserId,
            username,
            wager,
            prize: reward.name || 'Prize',
          },
        });
      } else {
        await tx.spinLog.create({
          data: {
            userId: targetUserId,
            username,
            wager,
            prize: 'Another spin',
          },
        });
      }

      // Clear global state
      await tx.spinState.update({
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
    });

    // popup text for UI
    let popup = null;
    if (reward?.type === 'coins') {
      popup = {
        text: `'${username}' siz +${reward.amount} tangalarni yutib oldingiz🎉`,
        imageUrl: null,
      };
    } else if (reward?.type === 'item') {
      popup = {
        text: `'${username}' siz '${reward.name}' yutib oldingiz🎉`,
        imageUrl: reward.imageUrl || null,
      };
    } else {
      popup = { text: `'${username}' uchun yana bir aylantirish!`, imageUrl: null };
    }

    return NextResponse.json({ ok: true, popup });
  } catch (err) {
    console.error('spin complete error', err);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
