import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

/**
 * Deducts coins for the spin, ensures enough balance.
 */
export async function POST(req) {
  try {
    const { tier } = await req.json();

    if (![50, 100, 200].includes(Number(tier))) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    // ⚙️ For demo: userId is static (replace with session later)
    const userId = 'demo-user';

    // get or create wallet
    const wallet = await prisma.wallet.upsert({
      where: { userId },
      update: {},
      create: { userId, balance: 1000 },
    });

    if (wallet.balance < tier) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    await prisma.wallet.update({
      where: { userId },
      data: { balance: { decrement: tier } },
    });

    // record spin start
    const spin = await prisma.spin.create({
      data: {
        userId,
        tier: Number(tier),
      },
    });

    return NextResponse.json({ success: true, spinId: spin.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Spin start failed' }, { status: 500 });
  }
}
