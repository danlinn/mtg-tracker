import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth-helpers";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [totalGames, wins, decks] = await Promise.all([
    prisma.gamePlayer.count({ where: { userId } }),
    prisma.gamePlayer.count({ where: { userId, isWinner: true } }),
    prisma.deck.findMany({
      where: { userId },
      include: {
        gameEntries: {
          select: { isWinner: true },
        },
      },
    }),
  ]);

  const deckStats = decks.map((deck) => ({
    id: deck.id,
    name: deck.name,
    commander: deck.commander,
    games: deck.gameEntries.length,
    wins: deck.gameEntries.filter((e) => e.isWinner).length,
    winRate:
      deck.gameEntries.length > 0
        ? Math.round(
            (deck.gameEntries.filter((e) => e.isWinner).length /
              deck.gameEntries.length) *
              100
          )
        : 0,
  }));

  return NextResponse.json({
    totalGames,
    wins,
    losses: totalGames - wins,
    winRate: totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0,
    deckStats,
  });
}
