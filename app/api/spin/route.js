export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireUser } from '@/app/lib/auth';
import { _buildSegments } from '@/app/api/segments/route';

// pick index by weights
function pickWeightedIndex(weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    if (r < weights[i]) return i;
    r -= weights[i];
  }
  return weights.length - 1;
}

export async function POST(req) {
  try {
    const me = await requireUser(); // must exist in your project (you already use it elsewhere)

    const body = await req.json().catch(() => ({}));
    const wager = Number(body.wager || 50);
    if (![50, 100, 200].includes(wager)) {
      return NextResponse.json({ error: 'bad wager' }, { status: 400 });
    }

    // lock spin state
    let st = await prisma.spinState.findUnique({ where: { id: 'global' } });
    if (!st) st = await prisma.spinState.create({ data: { id: 'global', status: 'IDLE' } });

    if (st.status === 'SPINNING') {
      return NextResponse.json({ error: 'busy' }, { status: 409 });
    }

    // wallet
    const wallet = await prisma.wallet.upsert({
      where: { userId: me.id },
      update: {},
      create: { userId: me.id, balance: 0 },
    });

    if ((wallet.balance ?? 0) < wager) {
      return NextResponse.json({ error: 'not enough coins' }, { status: 402 });
    }

    // Build segments + weights (must match /api/segments)
    const { segs, publicSegs } = await _buildSegments(wager);
    const weights = segs.map((s) => s.weight);

    // choose result
    const resultIndex = pickWeightedIndex(weights);
    const result = segs[resultIndex];

    // compute balance delta & prize text
    let delta = -wager;
    let prizeText = '';
    if (result.type === 'item') {
      prizeText = result.name;
    } else if (result.type === 'coins') {
      delta += result.amount;
      prizeText = `+${result.amount} coins`;
    } else {
      prizeText = 'Another spin';
      // give one more spin value back (don’t change balance now, effect is just extra turn)
      // You asked for “normal” chance, so only the result text matters here.
    }

    const durationMs = 10000; // 10 seconds
    const now = new Date();

    // Apply updates in a transaction
    const [updatedWallet, spinState] = await prisma.$transaction([
      prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: wallet.balance + delta },
      }),
      prisma.spinState.update({
        where: { id: 'global' },
        data: {
          status: 'SPINNING',
          userId: me.id,
          username: me.displayName || me.username,
          wager,
          segments: publicSegs,
          resultIndex,
          spinStartAt: now,
          durationMs,
        },
      }),
      prisma.spinLog.create({
        data: {
          userId: me.id,
          username: me.displayName || me.username,
          wager,
          prize: prizeText,
        },
      }),
    ]);

    return NextResponse.json(
      {
        userId: me.id,
        username: me.displayName || me.username,
        segments: publicSegs,
        resultIndex,
        spinStartAt: now,
        durationMs,
        balance: updatedWallet.balance,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e) {
    console.error('spin/', e);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
