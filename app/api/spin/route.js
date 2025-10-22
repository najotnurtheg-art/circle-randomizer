import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

export async function POST(req) {
  try {
    const { userId, tier } = await req.json();

    if (!userId || !tier) {
      return NextResponse.json({ error: "Missing userId or tier" }, { status: 400 });
    }

    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet || wallet.balance < tier) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }

    await prisma.wallet.update({
      where: { userId },
      data: { balance: { decrement: tier } },
    });

    // Fetch available items for this tier
    const items = await prisma.item.findMany({
      where: { active: true, tier: `T${tier}` },
    });

    if (!items.length) {
      return NextResponse.json({ error: "No rewards available" }, { status: 404 });
    }

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Spin route error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
