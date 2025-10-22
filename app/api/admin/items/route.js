import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

export async function GET() {
  try {
    const items = await prisma.item.findMany({
      orderBy: { tier: 'asc' },
    });
    return NextResponse.json(items);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to load items' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const data = await req.json();
    const { name, tier, imageUrl } = data;

    if (!name || !tier) {
      return NextResponse.json({ error: 'Name and tier required' }, { status: 400 });
    }

    const item = await prisma.item.create({
      data: {
        name,
        tier: Number(tier),
        imageUrl: imageUrl || null,
        active: true,
      },
    });

    return NextResponse.json(item);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 });
  }
}
