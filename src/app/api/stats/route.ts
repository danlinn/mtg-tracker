import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { calculateDeckStats, sortByLastPlayed } from "@/lib/deck-stats";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Dashboard always shows ALL your stats across all playgroups
  const [totalGames, wins, decks] = await Promise.all([
    prisma.gamePlayer.count({ where: { userId } }),
    prisma.gamePlayer.count({ where: { userId, isWinner: true } }),
    prisma.deck.findMany({
      where: { userId },
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

  const deckStats = sortByLastPlayed(decks.map(calculateDeckStats));

  return NextResponse.json({
    totalGames,
    wins,
    losses: totalGames - wins,
    winRate: totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0,
    deckStats,
  });
}
