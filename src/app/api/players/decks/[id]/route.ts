import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { calculateDeckStats } from "@/lib/deck-stats";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const deck = await prisma.deck.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true } },
      gameEntries: {
        select: {
          isWinner: true,
          game: {
            select: {
              players: { select: { id: true } },
            },
          },
        },
      },
    },
  });

  if (!deck) {
    return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  }

  const stats = calculateDeckStats(deck);

  return NextResponse.json({
    ...stats,
    commanderImage: deck.commanderImage,
    commander2Image: deck.commander2Image,
    colorW: deck.colorW,
    colorU: deck.colorU,
    colorB: deck.colorB,
    colorR: deck.colorR,
    colorG: deck.colorG,
    bracket: deck.bracket,
    edhp: deck.edhp,
    decklist: deck.decklist,
    owner: deck.user,
  });
}
