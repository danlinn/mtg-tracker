import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { calculateDeckStats, sortByLastPlayed } from "@/lib/deck-stats";
import { getActivePlaygroupId, getPlaygroupIdsForUser } from "@/lib/playgroup";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const activePlaygroupId = await getActivePlaygroupId();
  let gameFilter = {};
  if (activePlaygroupId) {
    gameFilter = { game: { playgroupId: activePlaygroupId } };
  } else {
    const pgIds = await getPlaygroupIdsForUser(userId);
    if (pgIds.length > 0) {
      gameFilter = { game: { playgroupId: { in: pgIds } } };
    }
  }

  const [totalGames, wins, decks] = await Promise.all([
    prisma.gamePlayer.count({ where: { userId, ...gameFilter } }),
    prisma.gamePlayer.count({ where: { userId, isWinner: true, ...gameFilter } }),
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
