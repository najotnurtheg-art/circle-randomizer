export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireUser } from '@/app/lib/auth';

/**
 * Completes an in-flight spin:
 *  - reads SpinState
 *  - applies reward (coins add to wallet)
 *  - logs SpinLog
 *  - resets SpinState
 * Returns: { balance, log, popup? }
 */
export async function POST() {
  const me = await requireUser().catch(() => null);
  if (!me) {
    return NextResponse.json(
      { error: 'unauthorized' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  try {
    // Read current spin
    const s = await prisma.spinState.findUnique({ where: { id: 'global' } });

    if (!s || s.status !== 'SPINNING' || !s.userId || s.userId !== me.sub) {
      return NextResponse.json(
        { error: 'no-active-spin' },
        { status: 409, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Extract the chosen reward from segments/resultIndex that were set on start
    const rewardBlob = (() => {
      try {
        const segs = (s.segments ?? []) as any[];
        const idx = s.resultIndex ?? -1;
        return idx >= 0 && idx < segs.length ? segs[idx] : null;
      } catch {
        return null;
      }
    })();

    if (!rewardBlob) {
      // Reset broken state so users aren’t stuck
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
      return NextResponse.json(
        { error: 'reward-missing' },
        { status: 500, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const isCoins = rewardBlob?.type === 'coins';
    const coinsDelta = isCoins ? Number(rewardBlob.amount || 0) : 0;
    const prizeName = isCoins ? `+${coinsDelta} coins` : String(rewardBlob?.name ?? 'Prize');

    // Apply reward, write log, reset state — all in one transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1) Apply wallet change if prize is coins
      if (isCoins) {
        await tx.wallet.upsert({
          where: { userId: me.sub },
          update: { balance: { increment: coinsDelta } },
          create: { userId: me.sub, balance: coinsDelta },
        });
      }

      // 2) Create SpinLog NOW (prevents “only last spin appears”)
      const log = await tx.spinLog.create({
        data: {
          userId: me.sub,
          username: me.name || me.username || 'user',
          wager: s.wager ?? 0,
          prize: prizeName,
        },
      });

      // 3) Reset the spin state
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
        },
      });

      // 4) Return current balance for the UI
      const w = await tx.wallet.findUnique({ where: { userId: me.sub } });

      return { balance: w?.balance ?? 0, log };
    });

    return NextResponse.json(
      {
        balance: result.balance,
        log: result.log, // <-- new row for instant UI insert
        popup: isCoins ? null : { title: 'Tabriklaymiz!', text: prizeName },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e) {
    return NextResponse.json(
      { error: 'server' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
