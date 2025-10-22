export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

function pickRandomDistinct(arr, count) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, Math.min(count, a.length));
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const tier = Number(searchParams.get('tier') || '50'); // 50/100/200

    const items = await prisma.item.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    const t50 = items.filter(i => i.tier === 'T50');
    const t100 = items.filter(i => i.tier === 'T100');
    const t200 = items.filter(i => i.tier === 'T200');
    const t500 = items.filter(i => i.tier === 'T500');

    const segs = [];

    if (tier === 50) {
      // all T50 items
      t50.forEach(it => segs.push({ type:'item', id: it.id, name: it.name, imageUrl: it.imageUrl ?? null }));
      // 2 from T100
      pickRandomDistinct(t100, 2).forEach(it => segs.push({ type:'item', id: it.id, name: it.name, imageUrl: it.imageUrl ?? null }));
      // +75
      segs.push({ type:'coins', amount: 75 });
      // respin
      segs.push({ type:'respin', label:'Another spin' });
    } else if (tier === 100) {
      // all T100
      t100.forEach(it => segs.push({ type:'item', id: it.id, name: it.name, imageUrl: it.imageUrl ?? null }));
      // 2 from T200
      pickRandomDistinct(t200, 2).forEach(it => segs.push({ type:'item', id: it.id, name: it.name, imageUrl: it.imageUrl ?? null }));
      // 2 from T50
      pickRandomDistinct(t50, 2).forEach(it => segs.push({ type:'item', id: it.id, name: it.name, imageUrl: it.imageUrl ?? null }));
      // +150
      segs.push({ type:'coins', amount: 150 });
      // respin
      segs.push({ type:'respin', label:'Another spin' });
    } else if (tier === 200) {
      // all T200
      t200.forEach(it => segs.push({ type:'item', id: it.id, name: it.name, imageUrl: it.imageUrl ?? null }));
      // 2 from T500
      pickRandomDistinct(t500, 2).forEach(it => segs.push({ type:'item', id: it.id, name: it.name, imageUrl: it.imageUrl ?? null }));
      // 2 from T100
      pickRandomDistinct(t100, 2).forEach(it => segs.push({ type:'item', id: it.id, name: it.name, imageUrl: it.imageUrl ?? null }));
      // +300
      segs.push({ type:'coins', amount: 300 });
      // respin
      segs.push({ type:'respin', label:'Another spin' });
    } else {
      segs.push({ type:'respin', label:'Another spin' });
    }

    while (segs.length < 6) segs.push({ type:'respin', label:'Another spin' });

    return NextResponse.json({ segments: segs }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('segments GET error', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
