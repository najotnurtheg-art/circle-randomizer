export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireAdmin } from '@/app/lib/auth'; // assume you have this; otherwise reuse requireUser + check isAdmin

export async function PATCH(req) {
  let admin; try { admin = requireAdmin(); } catch { return NextResponse.json({ error:'forbidden' }, { status:403 }); }
  const { userId, featured } = await req.json().catch(()=>({}));
  if (!userId || typeof featured !== 'boolean') return NextResponse.json({ error:'bad request' }, { status:400 });

  const u = await prisma.user.update({ where:{ id:userId }, data:{ featured } });
  return NextResponse.json({ id:u.id, featured:u.featured }, { headers:{ 'Cache-Control':'no-store' }});
}
