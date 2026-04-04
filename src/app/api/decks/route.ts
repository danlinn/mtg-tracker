import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth-helpers";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const decks = await prisma.deck.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(decks);
}

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, commander, colors } = await req.json();

  if (!name || !commander) {
    return NextResponse.json(
      { error: "Name and commander are required" },
      { status: 400 }
    );
  }

  const deck = await prisma.deck.create({
    data: {
      name,
      commander,
      colorW: colors?.W ?? false,
      colorU: colors?.U ?? false,
      colorB: colors?.B ?? false,
      colorR: colors?.R ?? false,
      colorG: colors?.G ?? false,
      userId,
    },
  });

  return NextResponse.json(deck);
}
