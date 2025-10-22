// app/api/spin/route.js
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getUser } from '@/app/lib/auth'; // must return current user or throw
import { buildSegmentsForWager, chooseWeightedIndex, prizeText } from '../_lib/segments';

const SPIN_DURATION = 10000; // 10s animation

export async function POST(req) {
  try {
    const me = await getUser(); // throws if not logged in
    const { wager } = await req.json();

    // load / create spin state
    let s = await prisma.spinState.findUnique({ where:{ id:'global' } });
    if (!s) s = await prisma.spinState.create({ data:{ id:'global', status:'IDLE' } });

    // if someone is spinning and it's not expired – refuse
    if (s.status === 'SPINNING' && s.spinStartAt && s.durationMs) {
      const doneAt = new Date(s.spinStartAt).getTime() + Number(s.durationMs);
      if (Date.now() < doneAt + 200) {
        return NextResponse.json({ error:'busy', username: s.username }, { status:409 });
      }
    }

    // wallet check
    const wallet = await prisma.wallet.upsert({
      where:{ userId: me.sub },
      update:{},
      create:{ userId: me.sub, balance: 0 }
    });
    if (wallet.balance < wager) {
      return NextResponse.json({ error:'not_enough_coins' }, { status:400 });
    }

    // build the wheel
    const { weighted, drawSegments } = await buildSegmentsForWager(Number(wager));
    const resultIndex = chooseWeightedIndex(weighted);
    const result = weighted[resultIndex];

    // deduct wager now; reward is applied in /complete
    await prisma.wallet.update({
      where:{ id: wallet.id },
      data:{ balance: { decrement: Number(wager) } }
    });

    // write the live state so everyone sees it
    const spinStartAt = new Date();
    await prisma.spinState.update({
      where:{ id:'global' },
      data:{
        status:'SPINNING',
        userId: me.sub,
        username: me.name || me.username || 'Guest',
        wager: Number(wager),
        segments: drawSegments,     // what to draw on canvases
        resultIndex,
        spinStartAt,
        durationMs: SPIN_DURATION,
        // keep pending reward in JSON for /complete
        pendingReward: result
      }
    });

    return NextResponse.json({
      status:'SPINNING',
      userId: me.sub,
      username: me.name || me.username || 'Guest',
      wager: Number(wager),
      segments: drawSegments,
      resultIndex,
      spinStartAt,
      durationMs: SPIN_DURATION,
    }, { headers:{'Cache-Control':'no-store'} });
  } catch (e) {
    console.error('spin POST failed', e);
    return NextResponse.json({ error:'server' }, { status:500 });
  }
}
