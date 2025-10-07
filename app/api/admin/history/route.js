import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireAdmin } from '@/app/lib/auth';

export async function GET() {
  try { requireAdmin(); } catch { return NextResponse.json({ error: 'forbidden' }, { status: 403 }); }
  const rows = await prisma.spinLog.findMany({ orderBy: { createdAt: 'desc' }, take: 500 });
  return NextResponse.json(rows);
}
