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

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, commander, commanderImage, commander2, commander2Image, colors, bracket, edhp, decklist } = body;

  if (!name || !commander) {
    return NextResponse.json(
      { error: "Name and commander are required" },
      { status: 400 }
    );
  }

  try {
    const deck = await prisma.deck.create({
      data: {
        name,
        commander,
        commanderImage: commanderImage ?? null,
        commander2: commander2?.trim() || null,
        commander2Image: commander2Image ?? null,
        bracket: bracket != null ? Number(bracket) : null,
        edhp: edhp != null ? Number(edhp) : null,
        decklist: decklist ?? null,
        colorW: colors?.W ?? false,
        colorU: colors?.U ?? false,
        colorB: colors?.B ?? false,
        colorR: colors?.R ?? false,
        colorG: colors?.G ?? false,
        userId,
      },
    });

    return NextResponse.json(deck);
  } catch (error) {
    console.error("[POST /api/decks] Error:", error);
    return NextResponse.json({ error: "Failed to create deck" }, { status: 500 });
  }
}
