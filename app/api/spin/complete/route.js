// app/api/spin/complete/route.js
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getUser } from '@/app/lib/auth';
import { prizeText } from '../../_lib/segments';

export async function POST() {
  try {
    const me = await getUser();

    const s = await prisma.spinState.findUnique({ where:{ id:'global' } });
    if (!s || s.status !== 'SPINNING' || !s.spinStartAt) {
      return NextResponse.json({ ok:true, message:'no_active_spin' });
    }

    const expired = Date.now() >= (new Date(s.spinStartAt).getTime() + Number(s.durationMs || 0));
    if (s.userId !== me.sub && !expired) {
      return NextResponse.json({ error:'forbidden' }, { status:403 });
    }

    const reward = s.pendingReward; // the weighted segment object
    let popup = null;

    // apply reward
    if (reward?.type === 'coins') {
      const w = await prisma.wallet.upsert({
        where:{ userId: s.userId! },
        update:{},
        create:{ userId: s.userId!, balance:0 }
      });
      await prisma.wallet.update({
        where:{ id: w.id },
        data:{ balance: { increment: Number(reward.amount || 0) } }
      });
      popup = { text: `'${s.username}' siz +${reward.amount} tangalarni yutib oldingiz🎉`, imageUrl: null };
      await prisma.spinLog.create({
        data:{
          userId: s.userId!,
          username: s.username || '',
          wager: s.wager || 0,
          prize: `+${reward.amount} coins`
        }
      });
    } else if (reward?.type === 'item') {
      popup = { text: `'${s.username}' siz '${reward.name}' yutib oldingiz🎉`, imageUrl: reward.imageUrl || null };
      await prisma.spinLog.create({
        data:{
          userId: s.userId!,
          username: s.username || '',
          wager: s.wager || 0,
          prize: reward.name || 'Prize'
        }
      });
    } else {
      popup = { text: `'${s.username}' uchun yana bir aylantirish!`, imageUrl: null };
      await prisma.spinLog.create({
        data:{
          userId: s.userId!,
          username: s.username || '',
          wager: s.wager || 0,
          prize: 'Another spin'
        }
      });
    }

    // reset the shared state
    await prisma.spinState.update({
      where:{ id:'global' },
      data:{
        status:'IDLE',
        userId: null, username: null, wager: null,
        segments: [], resultIndex: null, spinStartAt: null, durationMs: null,
        pendingReward: null
      }
    });

    return NextResponse.json({ ok:true, popup });
  } catch (e) {
    console.error('spin complete error', e);
    return NextResponse.json({ error:'server' }, { status:500 });
  }
}
