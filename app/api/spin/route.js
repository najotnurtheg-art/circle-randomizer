export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireUser } from '@/app/lib/auth';

// ---- helpers to build segments by wager ----
const priceOfTier = (tier) => tier === 'T50' ? 50 : tier === 'T100' ? 100 : tier === 'T200' ? 200 : 500;
const tierName = (w) => (w===50?'T50':w===100?'T100':w===200?'T200':'T500');

// weights (rarity) for cross-tier “coins” prizes
function coinWeightsFor(wager) {
  // baseline 1 = normal, higher = harder to hit
  // req: 50spin has 75 (2x harder), 100spin has 150 (2x harder), 200spin has 300 (2x harder)
  // extra coins: 50spin has two 100coin prizes (3x harder)
  //              100spin has one 50coin prize (2x easier -> weight 0.5) and one 200coin (3x harder)
  //              200spin has one 100coin (2x easier -> 0.5) and two 500coin (5x harder)
  if (wager === 50) return { bonus100Weight: 3, bonus75Weight: 2 };
  if (wager === 100) return { bonus50Weight: 0.5, bonus200Weight: 3, bonus150Weight: 2 };
  if (wager === 200) return { bonus100Weight: 0.5, bonus500Weight: 5, bonus300Weight: 2 };
  return {};
}

function buildSegments(baseItems, wager) {
  const segs = [];

  // Base items for this tier
  for (const it of baseItems) {
    segs.push({ type: 'item', id: it.id, name: it.name, imageUrl: it.imageUrl || null });
  }

  // Add specials / coins according to rules
  const w = coinWeightsFor(wager);

  if (wager === 50) {
    segs.push({ type: 'coins', amount: 75, weight: w.bonus75Weight || 2 });
    segs.push({ type: 'coins', amount: 100, weight: w.bonus100Weight || 3 });
    segs.push({ type: 'coins', amount: 100, weight: w.bonus100Weight || 3 });
    segs.push({ type: 'again' });
  }
  if (wager === 100) {
    segs.push({ type: 'coins', amount: 50,  weight: w.bonus50Weight  || 0.5 });
    segs.push({ type: 'coins', amount: 200, weight: w.bonus200Weight || 3 });
    segs.push({ type: 'coins', amount: 150, weight: w.bonus150Weight || 2 });
    segs.push({ type: 'again' });
  }
  if (wager === 200) {
    segs.push({ type: 'coins', amount: 100, weight: w.bonus100Weight || 0.5 });
    segs.push({ type: 'coins', amount: 500, weight: w.bonus500Weight || 5 });
    segs.push({ type: 'coins', amount: 500, weight: w.bonus500Weight || 5 });
    segs.push({ type: 'coins', amount: 300, weight: w.bonus300Weight || 2 });
    segs.push({ type: 'again' });
  }

  // default weight 1
  return segs.map(s => ({ ...s, weight: s.weight ? Number(s.weight) : 1 }));
}

function pickIndexWeighted(segments) {
  const weights = segments.map(s => Math.max(0.0001, Number(s.weight || 1)));
  const sum = weights.reduce((a,b)=>a+b, 0);
  let r = Math.random() * sum;
  for (let i=0;i<weights.length;i++) {
    if (r < weights[i]) return i;
    r -= weights[i];
  }
  return segments.length - 1;
}

export async function POST(req) {
  let me;
  try { me = requireUser(); } catch { return NextResponse.json({ error: 'unauth' }, { status: 401 }); }

  const body = await req.json().catch(()=>({}));
  const wager = Number(body.wager || 50);
  const tier = tierName(wager);

  // check global lock
  const lock = await prisma.spinState.findUnique({ where: { id: 'global' } });
  if (lock && lock.status === 'SPINNING' && lock.userId && lock.userId !== me.sub) {
    return NextResponse.json({ error: `busy` }, { status: 409 });
  }

  // balance check
  const user = await prisma.user.findUnique({ where: { id: me.sub } });
  if (!user) return NextResponse.json({ error: 'user not found' }, { status: 404 });
  if ((user.balance || 0) < wager) {
    return NextResponse.json({ error: 'not enough coins' }, { status: 400 });
  }

  // fetch active items of this tier
  const items = await prisma.item.findMany({
    where: { isActive: true, tier: tier },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const segments = buildSegments(items, wager);
  if (!segments.length) {
    return NextResponse.json({ error: 'no segments' }, { status: 400 });
  }

  // pick a result
  const resultIndex = pickIndexWeighted(segments);

  // charge immediately (prevents double-spend)
  const newBal = user.balance - wager;
  await prisma.user.update({ where: { id: me.sub }, data: { balance: newBal } });

  const now = new Date();
  const durationMs = 10000;

  // set shared state
  await prisma.spinState.upsert({
    where: { id: 'global' },
    create: {
      id: 'global',
      status: 'SPINNING',
      userId: me.sub,
      username: user.displayName || user.username || 'Player',
      wager,
      segments,
      resultIndex,
      spinStartAt: now,
      durationMs,
    },
    update: {
      status: 'SPINNING',
      userId: me.sub,
      username: user.displayName || user.username || 'Player',
      wager,
      segments,
      resultIndex,
      spinStartAt: now,
      durationMs,
    },
  });

  // Record reward after spin ends via a job? For now we return popup data for client
  const seg = segments[resultIndex];
  let popup = null;
  if (seg.type === 'item') {
    popup = { text: `'${user.displayName || user.username}' siz '${seg.name}' yutib oldingiz🎉`, imageUrl: seg.imageUrl || null };
    // store win
    await prisma.win.create({
      data: { userId: me.sub, prize: seg.name, coins: 0, imageUrl: seg.imageUrl || null }
    });
  } else if (seg.type === 'coins') {
    popup = { text: `'${user.displayName || user.username}' siz +${seg.amount} tangalarni yutib oldingiz🎉` };
    await prisma.user.update({ where: { id: me.sub }, data: { balance: newBal + seg.amount } });
    await prisma.win.create({
      data: { userId: me.sub, prize: `+${seg.amount} coins`, coins: seg.amount }
    });
  } // type 'again' gives no extra records

  // response the client animates with
  return NextResponse.json(
    {
      status: 'SPINNING',
      userId: me.sub,
      username: user.displayName || user.username || 'Player',
      wager,
      segments,
      resultIndex,
      spinStartAt: now.toISOString(),
      durationMs,
      balance: (await prisma.user.findUnique({ where: { id: me.sub } }))?.balance || 0,
      popup, // client will show after stop
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
