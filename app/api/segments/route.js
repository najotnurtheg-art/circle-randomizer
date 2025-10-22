import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

export async function GET() {
  try {
    const items = await prisma.item.findMany({
      where: { active: true, store: true },
      orderBy: { tier: "asc" },
    });

    const segments = items.map((item) => ({
      id: item.id,
      name: item.name,
      tier: item.tier,
      price: item.price,
      image: item.image || null,
    }));

    return NextResponse.json(segments);
  } catch (error) {
    console.error("Segments fetch error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
