import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { calculateDeckStats, sortByLastPlayed } from "@/lib/deck-stats";
import { buildGamePlayerWhere } from "@/lib/playgroup";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gamePlayerWhere = await buildGamePlayerWhere(userId);

  const [totalGames, wins, decks] = await Promise.all([
    prisma.gamePlayer.count({ where: { userId, ...gamePlayerWhere } }),
    prisma.gamePlayer.count({
      where: { userId, isWinner: true, ...gamePlayerWhere },
    }),
    prisma.deck.findMany({
      where: { userId },
      include: {
        gameEntries: {
          where: gamePlayerWhere,
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

  const deckStats = sortByLastPlayed(decks.map(calculateDeckStats));

  return NextResponse.json({
    totalGames,
    wins,
    losses: totalGames - wins,
    winRate: totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0,
    deckStats,
  });
}
