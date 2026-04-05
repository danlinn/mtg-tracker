import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { calculateDeckStats, sortByLastPlayed } from "@/lib/deck-stats";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  const [totalGames, wins, decks] = await Promise.all([
    prisma.gamePlayer.count({ where: { userId: id } }),
    prisma.gamePlayer.count({ where: { userId: id, isWinner: true } }),
    prisma.deck.findMany({
      where: { userId: id },
      include: {
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
    }),
  ]);

  const deckStats = sortByLastPlayed(
    decks.map((deck) => ({
      ...calculateDeckStats(deck),
      commanderImage: deck.commanderImage,
      commander2Image: deck.commander2Image,
      colorW: deck.colorW,
      colorU: deck.colorU,
      colorB: deck.colorB,
      colorR: deck.colorR,
      colorG: deck.colorG,
      bracket: deck.bracket,
      edhp: deck.edhp,
    }))
  );

  return NextResponse.json({
    id: user.id,
    name: user.name,
    totalGames,
    wins,
    losses: totalGames - wins,
    winRate: totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0,
    deckStats,
  });
}
