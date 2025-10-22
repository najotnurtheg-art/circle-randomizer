// app/api/segments/route.js
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { buildSegmentsForWager } from '../_lib/segments';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const tier = Number(searchParams.get('tier') || '50');
  const { drawSegments } = await buildSegmentsForWager(tier);
  return NextResponse.json({ segments: drawSegments }, { headers:{'Cache-Control':'no-store'} });
}
