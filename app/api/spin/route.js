export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireUser } from '@/app/lib/auth';

const STATE_ID = 'global';

// map wager to tier string used by your Item.tier
const tierFromWager = (w) => (w===50?'T50':w===100?'T100':w===200?'T200':'T500');

// weights for special coin prizes per your rules
function coinWeightsFor(w) {
  if (w === 50)  return { w75: 2,   w100: 3 };          // 75 (2x harder), two 100 (3x harder)
  if (w === 100) return { w50: 0.5, w200: 3, w150: 2 }; // 50 (2x easier), 200 (3x harder), 150 (2x harder)
  if (w === 200) return { w100: 0.5, w500: 5, w300: 2 }; // 100 (2x easier), two 500 (5x harder), 300 (2x harder)
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
  const total = segments.reduce((a,s)=>a + s.weight, 0);
  let r = Math.random() * total;
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
  const tier  = tierFromWager(wager);

  // If someone else is actively spinning and not expired -> block
  const s = await prisma.spinState.findUnique({ where:{ id: STATE_ID } });
  if (s && s.status === 'SPINNING' && s.userId && s.spinStartAt && s.durationMs) {
    const started = new Date(s.spinStartAt).getTime();
    const stillLocked = Date.now() <= started + Number(s.durationMs) + 1500; // grace
    if (stillLocked && s.userId !== me.sub) {
      return NextResponse.json({ error:'busy' }, { status:409 });
    }
  }

  // Get user + WALLET balance (this is what /api/me shows)
  const user   = await prisma.user.findUnique({ where:{ id: me.sub } });
  const wallet = await prisma.wallet.findUnique({ where:{ userId: me.sub } });
  const balance = Number(wallet?.balance ?? 0);
  if (balance < wager) return NextResponse.json({ error:'not enough coins' }, { status:400 });

  // Build wheel
  const items = await prisma.item.findMany({
    where: { isActive: true, tier },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  const segments = buildSegments(items, wager);
  if (!segments.length) return NextResponse.json({ error:'no segments' }, { status:400 });

  const resultIndex = pickIndexWeighted(segments);
  const now        = new Date();
  const durationMs = 10000;

  // Atomic: deduct wallet & set lock
  await prisma.$transaction([
    prisma.wallet.update({ where:{ userId: me.sub }, data:{ balance: balance - wager } }),
    prisma.spinState.upsert({
      where:{ id: STATE_ID },
      create: {
        id: STATE_ID, status:'SPINNING', userId: me.sub,
        username: user?.displayName || user?.username || 'Player',
        wager, segments, resultIndex, spinStartAt: now, durationMs,
      },
      update: {
        status:'SPINNING', userId: me.sub,
        username: user?.displayName || user?.username || 'Player',
        wager, segments, resultIndex, spinStartAt: now, durationMs,
      },
    }),
  ]);

  // Prepare + record reward immediately (so latest-wins & balance are correct)
  const seg = segments[resultIndex];
  let popup = null;

  if (seg.type === 'coins') {
    await prisma.wallet.update({
      where:{ userId: me.sub },
      data :{ balance: { increment: Number(seg.amount) } }
    });
    await prisma.spinLog.create({
      data: { userId: me.sub, username: user?.displayName || user?.username || 'Player', wager, prize: `+${seg.amount} coins` }
    });
    popup = { text: `'${user?.displayName || user?.username || 'Player'}' siz +${seg.amount} tangalarni yutib oldingiz🎉` };
  } else if (seg.type === 'item') {
    await prisma.spinLog.create({
      data: { userId: me.sub, username: user?.displayName || user?.username || 'Player', wager, prize: seg.name }
    });
    popup = { text: `'${user?.displayName || user?.username || 'Player'}' siz '${seg.name}' yutib oldingiz🎉`, imageUrl: seg.imageUrl || null };
  }
  // 'again' -> no credit/log needed

  const newBal = (await prisma.wallet.findUnique({ where:{ userId: me.sub } }))?.balance ?? 0;

  return NextResponse.json({
    status:'SPINNING',
    userId: me.sub,
    username: user?.displayName || user?.username || 'Player',
    wager, segments, resultIndex,
    spinStartAt: now.toISOString(),
    durationMs,
    balance: newBal,
    popup,
  }, { headers:{ 'Cache-Control':'no-store' }});
}
