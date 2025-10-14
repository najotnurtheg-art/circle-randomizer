export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireUser } from '@/app/lib/auth';

const priceByTier = (tier) =>
  tier === 'T50' ? 50 : tier === 'T100' ? 100 : tier === 'T200' ? 200 : 500;

export async function POST(req) {
  let me;
  try { me = requireUser(); } catch { return NextResponse.json({ error: 'unauth' }, { status: 401 }); }

  const { itemId } = await req.json().catch(()=> ({}));
  if (!itemId) return NextResponse.json({ error: 'itemId required' }, { status: 400 });

  const item = await prisma.item.findUnique({ where: { id: String(itemId) } });
  if (!item || !item.isActive || !item.purchasable) {
    return NextResponse.json({ error: 'item not purchasable' }, { status: 400 });
  }

  const price = priceByTier(item.tier);

  const user = await prisma.user.findUnique({ where: { id: me.sub } });
  const niceName = user?.displayName || user?.username || 'Player';
  const wallet = await prisma.wallet.findUnique({ where: { userId: me.sub } });
  if (!wallet || wallet.balance < price) return NextResponse.json({ error: 'insufficient_funds' }, { status: 400 });

  // charge & log
  const updated = await prisma.$transaction(async (tx) => {
    const w = await tx.wallet.update({
      where: { userId: me.sub },
      data: { balance: { decrement: price } }
    });

    await tx.spinLog.create({
      data: {
        userId: me.sub,
        username: user.username,
        wager: price,
        prize: item.name // treat as a normal win
      }
    });

    return w.balance;
  });

  return NextResponse.json({
    ok: true,
    balance: updated,
    popup: { text: `'${niceName}' siz '${item.name}' yutib oldingiz🎉`, imageUrl: item.imageUrl || null }
  });
}
