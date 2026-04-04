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

  const deckStats = decks.map((deck) => {
    const totalEntries = deck.gameEntries.length;
    const totalWins = deck.gameEntries.filter((e) => e.isWinner).length;

    const byPlayerCount: Record<number, { games: number; wins: number }> = {};
    for (const entry of deck.gameEntries) {
      const count = entry.game.players.length;
      if (!byPlayerCount[count]) byPlayerCount[count] = { games: 0, wins: 0 };
      byPlayerCount[count].games++;
      if (entry.isWinner) byPlayerCount[count].wins++;
    }

    const winRateByPlayerCount: Record<
      number,
      { games: number; wins: number; winRate: number }
    > = {};
    for (const [count, data] of Object.entries(byPlayerCount)) {
      winRateByPlayerCount[Number(count)] = {
        ...data,
        winRate: data.games > 0 ? Math.round((data.wins / data.games) * 100) : 0,
      };
    }

    return {
      id: deck.id,
      name: deck.name,
      commander: deck.commander,
      games: totalEntries,
      wins: totalWins,
      winRate:
        totalEntries > 0 ? Math.round((totalWins / totalEntries) * 100) : 0,
      winRateByPlayerCount,
    };
  });

  return NextResponse.json({
    totalGames,
    wins,
    losses: totalGames - wins,
    winRate: totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0,
    deckStats,
  });
}
