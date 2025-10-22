export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getUser } from '@/app/lib/auth';

export async function POST() {
  try {
    const me = await getUser();
    if (!me) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const s = await prisma.spinState.findUnique({ where: { id: 'global' } });
    if (!s || s.status !== 'SPINNING' || !s.spinStartAt || !s.durationMs) {
      return NextResponse.json({ error: 'no_active_spin' }, { status: 400 });
    }

    const start = new Date(s.spinStartAt).getTime();
    const endAt = start + Number(s.durationMs);
    const now = Date.now();

    if (now < endAt - 50) {
      return NextResponse.json({ error: 'too_early' }, { status: 400 });
    }

    // Only spinner can complete for first 5s after finish
    const grace = endAt + 5000;
    if (s.userId !== me.sub && now < grace) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    // Compute reward from saved segments+resultIndex
    let prizeText = 'Another spin';
    if (Array.isArray(s.segments) && typeof s.resultIndex === 'number' && s.segments[s.resultIndex]) {
      const seg = s.segments[s.resultIndex];
      if (seg?.type === 'coins') {
        const amount = Number(seg.amount) || 0;
        await prisma.wallet.upsert({
          where: { userId: s.userId || me.sub },
          update: { balance: { increment: amount } },
          create: { userId: s.userId || me.sub, balance: amount },
        });
        prizeText = `+${amount} coins`;
      } else if (seg?.type === 'item') {
        prizeText = seg.name || 'Item';
        // (No balance change for item. If you need stock control, add here.)
      } else {
        prizeText = 'Another spin';
      }
    }

    // Log win
    await prisma.spinLog.create({
      data: {
        userId: s.userId || me.sub,
        username: s.username || 'player',
        wager: s.wager || 0,
        prize: prizeText,
      },
    });

    // Clear lock
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
      },
    });

    return NextResponse.json({ ok: true, prize: prizeText });
  } catch (e) {
    console.error('complete POST error', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
