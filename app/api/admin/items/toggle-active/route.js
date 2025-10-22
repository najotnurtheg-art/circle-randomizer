import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

export async function POST(req) {
  try {
    const { id, active } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Missing item ID' }, { status: 400 });
    }

    const updated = await prisma.item.update({
      where: { id },
      data: { active: Boolean(active) },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to toggle item' }, { status: 500 });
  }
}
