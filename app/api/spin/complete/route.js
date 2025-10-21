export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireUser } from '@/app/lib/auth';

const STATE_ID = 'global';

export async function POST() {
  let me; try { me = requireUser(); } catch { return NextResponse.json({ error:'unauth' }, { status:401 }); }

  const s = await prisma.spinState.findUnique({ where:{ id: STATE_ID }});
  if (!s || s.status !== 'SPINNING' || !s.pendingReward)
    return NextResponse.json({ error:'no-pending' }, { status:400 });

  // Only the spinner (or expired) may complete
  const expired = s.spinStartAt && s.durationMs && (Date.now() - new Date(s.spinStartAt).getTime() > Number(s.durationMs));
  if (s.userId !== me.sub && !expired)
    return NextResponse.json({ error:'forbidden' }, { status:403 });

  const user = await prisma.user.findUnique({ where:{ id: s.userId! }});
  const reward = s.pendingReward;

  // Apply reward & log
  if (reward.type === 'coins') {
    await prisma.wallet.update({ where:{ userId: s.userId! }, data:{ balance: { increment: Number(reward.amount) } }});
    await prisma.spinLog.create({ data: { userId: s.userId!, username: user?.displayName || user?.username || 'Player', wager: s.wager || 0, prize: `+${reward.amount} coins` }});
  } else if (reward.type === 'item') {
    await prisma.spinLog.create({ data: { userId: s.userId!, username: user?.displayName || user?.username || 'Player', wager: s.wager || 0, prize: reward.name || 'Item' }});
  }

  // Clear state
  await prisma.spinState.update({
    where:{ id: STATE_ID },
    data: {
      status:'IDLE', userId:null, username:null, wager:null,
      segments:[], resultIndex:null, spinStartAt:null, durationMs:null,
      pendingReward: null
    }
  });

  const balance = (await prisma.wallet.findUnique({ where:{ userId: user!.id } }))?.balance ?? 0;
  const popup = reward.type === 'coins'
    ? { text: `'${user?.displayName || user?.username || 'Player'}' siz +${reward.amount} tangalarni yutib oldingiz🎉` }
    : { text: `'${user?.displayName || user?.username || 'Player'}' siz '${reward.name}' yutib oldingiz🎉`, imageUrl: reward.imageUrl || null };

  return NextResponse.json({ ok:true, balance, popup }, { headers:{ 'Cache-Control':'no-store' } });
}
