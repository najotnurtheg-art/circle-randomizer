export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import bcrypt from 'bcryptjs';
import { requireAdmin } from '@/app/lib/auth'; // or your own admin check

export async function POST(req) {
  let admin;
  try { admin = requireAdmin(); } catch { return NextResponse.json({ error:'forbidden' }, { status:403 }); }

  const { userId, newPassword } = await req.json().catch(()=>({}));
  if (!userId || !newPassword || newPassword.length < 6) {
    return NextResponse.json({ error:'Bad request' }, { status:400 });
  }

  const hash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where:{ id:userId }, data:{ passwordHash: hash } });

  return NextResponse.json({ ok:true });
}
