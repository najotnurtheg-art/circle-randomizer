// app/api/store/buy/route.js
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireUser } from '@/app/lib/auth';

const priceOfTier = (tier) => {
  switch (tier) {
    case 'T50': return 50;
    case 'T100': return 100;
    case 'T200': return 200;
    case 'T500': return 500;
    default: return null;
  }
};

export async function POST(req) {
  let me;
  try {
    me = await requireUser(); // should throw if unauth
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  const { itemId } = body || {};
  if (!itemId) {
    return NextResponse.json({ error: 'itemId required' }, { status: 400 });
  }

  // Fetch item and validate availability
  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item || !item.isActive || !item.purchasable) {
    return NextResponse.json({ error: 'not available' }, { status: 400 });
  }

  const price = priceOfTier(item.tier);
  if (!price) {
    return NextResponse.json({ error: 'invalid item tier' }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Upsert wallet
      const wallet = await tx.wallet.upsert({
        where: { userId: me.sub },
        update: {},
        create: { userId: me.sub, balance: 0 },
      });

      if (wallet.balance < price) {
        // Throw special token to map to HTTP 400
        throw new Error('INSUFFICIENT_FUNDS');
      }

      // Deduct price
      const updated = await tx.wallet.update({
        where: { userId: me.sub },
        data: { balance: wallet.balance - price },
      });

      // For the “latest wins” list we reuse SpinLog
      const user = await tx.user.findUnique({ where: { id: me.sub } });
      const display = user?.displayName || user?.username || me.username || 'User';

      await tx.spinLog.create({
        data: {
          userId: me.sub,
          username: display,
          wager: price,                  // use price as the “spent” value
          prize: item.name,              // what they “bought”
        },
      });

      return { balance: updated.balance };
    });

    // Popup shown on the wheel page
    const popup = {
      text: `Tabriklaymiz! Siz do‘kondan "${item.name}" xarid qildingiz 🎉`,
      imageUrl: item.imageUrl || null,
    };

    return NextResponse.json(
      { balance: result.balance, popup },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e) {
    if (e instanceof Error && e.message === 'INSUFFICIENT_FUNDS') {
      return NextResponse.json({ error: 'not enough coins' }, { status: 400 });
    }
    // unexpected
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
