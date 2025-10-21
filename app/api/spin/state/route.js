export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireUser } from '@/app/lib/auth';

const STATE_ID = 'global';
const tierFromWager = (w) => (w===50?'T50':w===100?'T100':w===200?'T200':'T500');

function coinWeightsFor(w) {
  if (w === 50)  return { w75: 2,   w100: 3 };
  if (w === 100) return { w50: 0.5, w200: 3, w150: 2 };
  if (w === 200) return { w100: 0.5, w500: 5, w300: 2 };
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
  const total = segments.reduce((a,s)=>a+s.weight, 0);
  let r = Math.random() * total;
  for (let i=0;i<segments.length;i++) { if (r < segments[i].weight) return i; r -= segments[i].weight; }
  return segments.length-1;
}

export async function POST(req) {
  let me; try { me = requireUser(); } catch { return NextResponse.json({ error:'unauth' }, { status:401 }); }
  const body = await req.json().catch(()=>({}));
  const wager = [50,100,200].includes(Number(body.wager)) ? Number(body.wager) : 50;
  const tier  = tierFromWager(wager);

  // lock check (respect expiry)
  const s = await prisma.spinState.findUnique({ where:{ id: STATE_ID } });
  if (s && s.status === 'SPINNING' && s.userId && s.spinStartAt && s.durationMs) {
    const started = new Date(s.spinStartAt).getTime();
    const stillLocked = Date.now() <= started + Number(s.durationMs) + 1500;
    if (stillLocked && s.userId !== me.sub) return NextResponse.json({ error:'busy' }, { status:409 });
  }

  // WALLET balance
  const wallet = await prisma.wallet.findUnique({ where:{ userId: me.sub }});
  const bal = Number(wallet?.balance ?? 0);
  if (bal < wager) return NextResponse.json({ error:'not enough coins' }, { status:400 });

  // segments
  const items = await prisma.item.findMany({ where:{ isActive:true, tier }, orderBy:{ createdAt:'desc' }, take:100 });
  const segments = buildSegments(items, wager);
  if (!segments.length) return NextResponse.json({ error:'no segments' }, { status:400 });

  const resultIndex = pickIndexWeighted(segments);
  const now = new Date();
  const durationMs = 10000;

  // Deduct wager & set SPINNING + remember the pending prize (no credit yet)
  const seg = segments[resultIndex];
  await prisma.$transaction([
    prisma.wallet.update({ where:{ userId: me.sub }, data:{ balance: bal - wager } }),
    prisma.spinState.upsert({
      where:{ id: STATE_ID },
      create: {
        id: STATE_ID, status:'SPINNING', userId: me.sub,
        username: (await prisma.user.findUnique({ where:{ id: me.sub }}))?.displayName || (await prisma.user.findUnique({ where:{ id: me.sub }}))?.username || 'Player',
        wager, segments, resultIndex, spinStartAt: now, durationMs,
        // store pending reward to apply on /complete
        pendingReward: seg,
      },
      update: {
        status:'SPINNING', userId: me.sub,
        username: (await prisma.user.findUnique({ where:{ id: me.sub }}))?.displayName || (await prisma.user.findUnique({ where:{ id: me.sub }}))?.username || 'Player',
        wager, segments, resultIndex, spinStartAt: now, durationMs,
        pendingReward: seg,
      },
    }),
  ]);

  const newBal = (await prisma.wallet.findUnique({ where:{ userId: me.sub } }))?.balance ?? 0;

  return NextResponse.json({
    status:'SPINNING',
    userId: me.sub,
    username: (await prisma.user.findUnique({ where:{ id: me.sub }}))?.displayName || (await prisma.user.findUnique({ where:{ id: me.sub }}))?.username || 'Player',
    wager, segments, resultIndex,
    spinStartAt: now.toISOString(),
    durationMs,
    balance: newBal,
    // no popup now; popup will be sent by /complete right after the wheel stops
  }, { headers:{ 'Cache-Control':'no-store' }});
}
