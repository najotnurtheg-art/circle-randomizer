export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireUser } from '@/app/lib/auth';

const ID = 'global';

const tierFromWager = (w) => (w===50?'T50':w===100?'T100':w===200?'T200':'T500');
const priceOfTier = (tier) => tier==='T50'?50:tier==='T100'?100:tier==='T200'?200:500;

// weights for cross-tier “coins” prizes
function coinWeightsFor(wager) {
  // 50spin -> add 75 (2x harder), two 100 (3x harder)
  // 100spin -> add 50 (2x easier), 200 (3x harder), 150 (2x harder)
  // 200spin -> add 100 (2x easier), two 500 (5x harder), 300 (2x harder)
  if (wager === 50) return { w75: 2, w100: 3 };
  if (wager === 100) return { w50: 0.5, w200: 3, w150: 2 };
  if (wager === 200) return { w100: 0.5, w500: 5, w300: 2 };
  return {};
}

function buildSegments(items, wager) {
  const segs = items.map(i => ({ type:'item', id:i.id, name:i.name, imageUrl:i.imageUrl||null, weight:1 }));
  const W = coinWeightsFor(wager);

  if (wager === 50) {
    segs.push({ type:'coins', amount:75,  weight: W.w75 ?? 2 });
    segs.push({ type:'coins', amount:100, weight: W.w100 ?? 3 });
    segs.push({ type:'coins', amount:100, weight: W.w100 ?? 3 });
    segs.push({ type:'again', weight:1 });
  }
  if (wager === 100) {
    segs.push({ type:'coins', amount:50,  weight: W.w50  ?? 0.5 });
    segs.push({ type:'coins', amount:200, weight: W.w200 ?? 3 });
    segs.push({ type:'coins', amount:150, weight: W.w150 ?? 2 });
    segs.push({ type:'again', weight:1 });
  }
  if (wager === 200) {
    segs.push({ type:'coins', amount:100, weight: W.w100 ?? 0.5 });
    segs.push({ type:'coins', amount:500, weight: W.w500 ?? 5 });
    segs.push({ type:'coins', amount:500, weight: W.w500 ?? 5 });
    segs.push({ type:'coins', amount:300, weight: W.w300 ?? 2 });
    segs.push({ type:'again', weight:1 });
  }

  return segs.map(s => ({ ...s, weight: Math.max(0.0001, Number(s.weight||1)) }));
}

function pickIndexWeighted(segments) {
  const sum = segments.reduce((a,s)=>a+s.weight, 0);
  let r = Math.random() * sum;
  for (let i=0;i<segments.length;i++) {
    if (r < segments[i].weight) return i;
    r -= segments[i].weight;
  }
  return segments.length-1;
}

export async function POST(req) {
  let me;
  try { me = requireUser(); } catch { return NextResponse.json({ error:'unauth' }, { status:401 }); }

  const body = await req.json().catch(()=>({}));
  const wager = [50,100,200].includes(Number(body.wager)) ? Number(body.wager) : 50;
  const tier = tierFromWager(wager);

  // If someone else is really spinning *and not expired*, block.
  const s = await prisma.spinState.findUnique({ where:{ id: ID } });
  if (s && s.status === 'SPINNING' && s.userId && s.spinStartAt && s.durationMs) {
    const started = new Date(s.spinStartAt).getTime();
    const stillLocked = Date.now() <= started + Number(s.durationMs) + 1500;
    if (stillLocked && s.userId !== me.sub) {
      return NextResponse.json({ error:'busy' }, { status:409 });
    }
  }

  // Fresh user & balance check
  const user = await prisma.user.findUnique({ where:{ id: me.sub } });
  const balance = Number(user?.balance ?? 0);
  if (balance < wager) {
    return NextResponse.json({ error:'not enough coins' }, { status:400 });
  }

  // Build segments (active items from this tier)
  const items = await prisma.item.findMany({
    where: { isActive: true, tier },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  const segments = buildSegments(items, wager);
  if (!segments.length) return NextResponse.json({ error:'no segments' }, { status:400 });

  const resultIndex = pickIndexWeighted(segments);
  const now = new Date();
  const durationMs = 10000;

  // Atomic: charge & set shared state (only now we set the lock)
  await prisma.$transaction([
    prisma.user.update({ where:{ id: me.sub }, data:{ balance: balance - wager } }),
    prisma.spinState.upsert({
      where:{ id: ID },
      create: {
        id: ID, status:'SPINNING', userId: me.sub,
        username: user.displayName || user.username || 'Player',
        wager, segments, resultIndex, spinStartAt: now, durationMs,
      },
      update: {
        status:'SPINNING', userId: me.sub,
        username: user.displayName || user.username || 'Player',
        wager, segments, resultIndex, spinStartAt: now, durationMs,
      },
    }),
  ]);

  // Precompute popup (client shows it after stop)
  const seg = segments[resultIndex];
  let popup = null;

  // If it's coins, we credit immediately so balance on response is correct.
  if (seg.type === 'coins') {
    await prisma.user.update({
      where:{ id: me.sub },
      data:{ balance: { increment: Number(seg.amount) } }
    });
    await prisma.win.create({
      data: { userId: me.sub, prize: `+${seg.amount} coins`, coins: Number(seg.amount) }
    });
    popup = { text: `'${user.displayName || user.username}' siz +${seg.amount} tangalarni yutib oldingiz🎉` };
  } else if (seg.type === 'item') {
    await prisma.win.create({
      data: { userId: me.sub, prize: seg.name, coins: 0, imageUrl: seg.imageUrl || null }
    });
    popup = { text: `'${user.displayName || user.username}' siz '${seg.name}' yutib oldingiz🎉`, imageUrl: seg.imageUrl || null };
  } // 'again' -> nothing to record/credit

  const newBal = (await prisma.user.findUnique({ where:{ id: me.sub } }))?.balance || 0;

  return NextResponse.json({
    status:'SPINNING',
    userId: me.sub,
    username: user.displayName || user.username || 'Player',
    wager, segments, resultIndex,
    spinStartAt: now.toISOString(),
    durationMs,
    balance: newBal,
    popup,
  }, { headers:{ 'Cache-Control':'no-store' }});
}
