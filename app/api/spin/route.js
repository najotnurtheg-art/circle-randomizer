// app/api/spin/route.js
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireUser } from '@/app/lib/auth';

const W_NORMAL = 10;
const W_2X_HARDER = 5;
const W_3X_HARDER = 3;
const W_5X_HARDER = 2;
const W_AGAIN = 10;

function cyclePick(arr, n) {
  const out = [];
  if (arr.length === 0) return out;
  for (let i = 0; i < n; i++) out.push(arr[i % arr.length]);
  return out;
}

function buildSegments({ items50, items100, items200, items500 }, wager) {
  const segs = [];

  if (wager === 50) {
    for (const it of items50) segs.push({ type: 'item', name: it.name, imageUrl: it.imageUrl || null, weight: W_NORMAL });
    for (const it of cyclePick(items100, 2)) segs.push({ type: 'item', name: it.name, imageUrl: it.imageUrl || null, weight: W_3X_HARDER });
    segs.push({ type: 'coins', amount: 75, weight: W_2X_HARDER });
    segs.push({ type: 'again', weight: W_AGAIN });
  }

  if (wager === 100) {
    for (const it of items100) segs.push({ type: 'item', name: it.name, imageUrl: it.imageUrl || null, weight: W_NORMAL });
    for (const it of cyclePick(items200, 2)) segs.push({ type: 'item', name: it.name, imageUrl: it.imageUrl || null, weight: W_3X_HARDER });
    for (const it of cyclePick(items50, 2))  segs.push({ type: 'item', name: it.name, imageUrl: it.imageUrl || null, weight: W_3X_HARDER });
    segs.push({ type: 'coins', amount: 150, weight: W_2X_HARDER });
    segs.push({ type: 'again', weight: W_AGAIN });
  }

  if (wager === 200) {
    for (const it of items200) segs.push({ type: 'item', name: it.name, imageUrl: it.imageUrl || null, weight: W_NORMAL });
    for (const it of cyclePick(items500, 2)) segs.push({ type: 'item', name: it.name, imageUrl: it.imageUrl || null, weight: W_5X_HARDER });
    for (const it of cyclePick(items100, 2)) segs.push({ type: 'item', name: it.name, imageUrl: it.imageUrl || null, weight: W_2X_HARDER });
    segs.push({ type: 'coins', amount: 300, weight: W_3X_HARDER });
    segs.push({ type: 'again', weight: W_AGAIN });
  }

  return segs;
}

function pickIndexWeighted(segments) {
  const total = segments.reduce((s, x) => s + (x.weight || 1), 0);
  let r = Math.random() * total;
  for (let i = 0; i < segments.length; i++) {
    r -= (segments[i].weight || 1);
    if (r <= 0) return i;
  }
  return segments.length - 1;
}

export async function POST(req) {
  let me;
  try {
    me = await requireUser();
  } catch {
    return NextResponse.json({ error: 'auth' }, { status: 401 });
  }

  const { wager } = await req.json().catch(() => ({}));
  const W = Number(wager);
  if (![50, 100, 200].includes(W)) {
    return NextResponse.json({ error: 'bad wager' }, { status: 400 });
  }

  const wallet = await prisma.wallet.findUnique({ where: { userId: me.id } });
  const balance = wallet?.balance ?? 0;
  if (balance < W) {
    return NextResponse.json({ error: 'not enough coins' }, { status: 400 });
  }

  const [items50, items100, items200, items500] = await Promise.all([
    prisma.item.findMany({ where: { isActive: true, tier: 'T50' }, select: { name: true, imageUrl: true } }),
    prisma.item.findMany({ where: { isActive: true, tier: 'T100' }, select: { name: true, imageUrl: true } }),
    prisma.item.findMany({ where: { isActive: true, tier: 'T200' }, select: { name: true, imageUrl: true } }),
    prisma.item.findMany({ where: { isActive: true, tier: 'T500' }, select: { name: true, imageUrl: true } }),
  ]);

  const segments = buildSegments({ items50, items100, items200, items500 }, W);

  await prisma.wallet.update({
    where: { userId: me.id },
    data: { balance: { decrement: W } },
  });

  const resultIndex = pickIndexWeighted(segments);
  const seg = segments[resultIndex];

  let prizeText = '';
  let balanceAfter = balance - W;

  if (seg.type === 'coins') {
    balanceAfter += seg.amount;
    await prisma.wallet.update({
      where: { userId: me.id },
      data: { balance: { increment: seg.amount } },
    });
    prizeText = `+${seg.amount} coins`;
  } else if (seg.type === 'again') {
    prizeText = 'Another spin';
  } else if (seg.type === 'item') {
    prizeText = seg.name;
  }

  await prisma.spinLog.create({
    data: {
      userId: me.id,
      username: me.displayName || me.username || 'user',
      wager: W,
      prize: prizeText,
    },
  });

  const spin = {
    status: 'SPINNING',
    userId: me.id,
    username: me.displayName || me.username || 'user',
    wager: W,
    segments,
    resultIndex,
    spinStartAt: new Date().toISOString(),
    durationMs: 10000,
    balance: balanceAfter,
  };

  try {
    await prisma.spinState.upsert({
      where: { id: 'global' },
      update: spin,
      create: { id: 'global', ...spin },
    });
  } catch {}

  return NextResponse.json(spin, { headers: { 'Cache-Control': 'no-store' } });
}
