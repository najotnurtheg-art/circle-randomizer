// app/api/store/buy/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireUser } from "@/app/lib/auth";

/**
 * POST /api/store/buy
 * Body: { storeItemId: string }
 *
 * Decreases user's balance, logs the purchase in SpinLog
 * and returns new balance.
 */
export async function POST(req) {
  try {
    const me = await requireUser(); // throws if not logged in

    const body = await req.json().catch(() => null);
    const storeItemId = body && body.storeItemId;

    if (!storeItemId) {
      return NextResponse.json(
        { error: "missing_store_item_id" },
        { status: 400 }
      );
    }

    const item = await prisma.storeItem.findUnique({
      where: { id: storeItemId },
    });

    if (!item || !item.active) {
      return NextResponse.json(
        { error: "item_not_found_or_inactive" },
        { status: 404 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: me.id },
    });

    if (!user) {
      return NextResponse.json(
        { error: "user_not_found" },
        { status: 404 }
      );
    }

    if (user.balance < item.price) {
      return NextResponse.json(
        { error: "insufficient_balance" },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        balance: { decrement: item.price },
      },
    });

    // Log store purchase into SpinLog so it appears in rewards
    await prisma.spinLog.create({
      data: {
        userId: updatedUser.id,
        username: updatedUser.name || updatedUser.login,
        wager: item.price,
        prize: `[Do'kondan xarid] ${item.name}`,
      },
    });

    return NextResponse.json({
      ok: true,
      newBalance: updatedUser.balance,
      item: {
        id: item.id,
        name: item.name,
        price: item.price,
        imageUrl: item.imageUrl,
      },
    });
  } catch (e) {
    console.error("STORE_BUY_ERROR", e);
    return NextResponse.json(
      { error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
