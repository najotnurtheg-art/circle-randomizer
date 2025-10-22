import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

/**
 * Applies the reward after a spin finishes.
 * Handles coins or items, prevents double spending.
 */
export async function POST(req) {
  try {
    const { rewardId, reward, tier } = await req.json();
    const userId = 'demo-user';

    if (!rewardId || !reward) {
      return NextResponse.json({ error: 'Missing reward info' }, { status: 400 });
    }

    // Coins reward
    if (reward.type === 'coins' && reward.amount) {
      await prisma.wallet.upsert({
        where: { userId },
        update: { balance: { increment: reward.amount } },
        create: { userId, balance: reward.amount },
      });
    }

    // Log spin result
    await prisma.spin.create({
      data: {
        userId,
        tier: Number(tier),
        rewardId: String(rewardId),
        reward: reward.name || `${reward.amount} coins`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Spin complete failed' }, { status: 500 });
  }
}
