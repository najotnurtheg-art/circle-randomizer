export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET() {
  const logs = await prisma.spinLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    // NOTE: SpinLog already stores username/userId; no relation include needed
  });

  return NextResponse.json(
    logs.map((l) => ({
      id: l.id,
      userId: l.userId,
      username: l.username,
      wager: l.wager,
      prize: l.prize,
      createdAt: l.createdAt,
    })),
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
