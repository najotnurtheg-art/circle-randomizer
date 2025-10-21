export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireUser } from '@/app/lib/auth';

const STATE_ID = 'global';

export async function POST() {
  // auth
  let me;
  try { me = requireUser(); } catch { return NextResponse.json({ error: 'unauth' }, { status: 401 }); }

  // read state
  const s = await prisma.spinState.findUnique({ where: { id: STATE_ID } });
  if (!s || s.status !== 'SPINNING') return NextResponse.json({ error: 'no-spin' }, { status: 400 });

  // allow only spinner (unless expired)
  const started = s.spinStartAt ? new Date(s.spinStartAt).getTime() : 0;
  const dur = Number(s.durationMs || 0);
  const expired = started && dur ? Date.now() > started + dur + 500 : false;
  if (s.userId && s.userId !== me.sub && !expired) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // determine reward from stored segments/resultIndex
  let reward = null;
  if (Array.isArray(s.segments) && typeof s.resultIndex === 'number') {
    reward = s.segments[s.resultIndex] || null;
  }

  const user = s.userId ? await prisma.user.findUnique({ where: { id: s.userId } }) : null;
  const display = (user && (user.displayName || user.username)) || s.username || 'Player';

  // apply reward + log
  if (reward && reward.type === 'coins') {
    await prisma.wallet.update({
      where: { userId: s.userId || me.sub },
      data: { balance: { increment: Number(reward.amount || 0) } },
    });
    await prisma.spinLog.create({
      data: {
        userId: s.userId || me.sub,
        username: display,
        wager: s.wager || 0,
        prize: `+${Number(reward.amount || 0)} coins`,
      },
    });
  } else if (reward && reward.type === 'item') {
    await prisma.spinLog.create({
      data: {
        userId: s.userId || me.sub,
        username: display,
        wager: s.wager || 0,
        prize: reward.name || 'Item',
      },
    });
  }
  // 'again' → no credit/log

  // clear state
  await prisma.spinState.update({
    where: { id: STATE_ID },
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

  const newBal = (await prisma.wallet.findUnique({ where: { userId: (s.userId || me.sub) } }))?.balance || 0;

  let popup = null;
  if (reward?.type === 'coins') {
    popup = { text: `'${display}' siz +${Number(reward.amount || 0)} tangalarni yutib oldingiz🎉` };
  } else if (reward?.type === 'item') {
    popup = { text: `'${display}' siz '${reward.name}' yutib oldingiz🎉`, imageUrl: reward.imageUrl || null };
  }

  return NextResponse.json({ ok: true, balance: newBal, popup }, { headers: { 'Cache-Control': 'no-store' } });
}
