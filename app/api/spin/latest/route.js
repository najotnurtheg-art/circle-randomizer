export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET() {
  try {
    const logs = await prisma.spinLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json(logs, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json(
      { error: 'server' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
