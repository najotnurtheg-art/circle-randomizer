export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireAdmin } from '@/app/lib/auth';

export async function PATCH(req, { params }) {
  try { requireAdmin(); } catch { return NextResponse.json({ error: 'forbidden' }, { status: 403 }); }
  const { displayName, role } = await req.json().catch(()=> ({}));
  const data = {};
  if (typeof displayName === 'string') data.displayName = displayName.trim();
  if (role === 'USER' || role === 'ADMIN') data.role = role;
  if (Object.keys(data).length === 0) return NextResponse.json({ error: 'nothing to update' }, { status: 400 });

  const user = await prisma.user.update({ where: { id: params.id }, data });
  return NextResponse.json({ id: user.id, username: user.username, displayName: user.displayName || user.username, role: user.role });
}
