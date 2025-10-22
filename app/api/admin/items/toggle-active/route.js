import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

export async function POST(req) {
  try {
    const { id, active } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Missing item ID" }, { status: 400 });
    }

    const updated = await prisma.item.update({
      where: { id },
      data: { active: Boolean(active) },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Toggle active failed:", error);
    return NextResponse.json(
      { error: "Server error while toggling item" },
      { status: 500 }
    );
  }
}
