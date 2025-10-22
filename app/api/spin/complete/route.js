import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

export async function POST(req) {
  try {
    const { userId, rewardId } = await req.json();

    if (!userId || !rewardId) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    const reward = await prisma.item.findUnique({ where: { id: rewardId } });
    if (!reward) {
      return NextResponse.json({ error: "Reward not found" }, { status: 404 });
    }

    if (reward.type === "coins") {
      await prisma.wallet.update({
        where: { userId },
        data: { balance: { increment: reward.value || 0 } },
      });
    }

    await prisma.spinHistory.create({
      data: {
        userId,
        rewardId,
        timestamp: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Spin complete error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
