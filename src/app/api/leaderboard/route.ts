import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { getWinLabel } from "@/lib/win-labels";
import { getActivePlaygroupId, getPlaygroupIdsForUser } from "@/lib/playgroup";

export async function GET(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const perPage = [20, 50, 100].includes(Number(searchParams.get("perPage")))
    ? Number(searchParams.get("perPage"))
    : 20;

  const activePlaygroupId = await getActivePlaygroupId();
  // Specific group: filter to that group
  // All groups: filter to games in user's groups or unassigned
  let gameFilter;
  if (activePlaygroupId) {
    gameFilter = { game: { playgroupId: activePlaygroupId } };
  } else {
    const pgIds = await getPlaygroupIdsForUser(userId);
    gameFilter = {
      game: {
        OR: [
          { playgroupId: { in: pgIds } },
          { playgroupId: null },
        ],
      },
    };
  }

  const users = await prisma.user.findMany({
    where: { gameEntries: { some: gameFilter } },
    select: {
      id: true,
      name: true,
      gameEntries: {
        where: gameFilter,
        select: {
          isWinner: true,
          game: {
            select: {
              players: {
                select: {
                  id: true,
                  isWinner: true,
                  deck: { select: { bracket: true, edhp: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  const leaderboard = users
    .map((user) => {
      let niceWins = 0;
      let bigWins = 0;
      let easyWins = 0;

      const byPlayerCount: Record<number, { games: number; wins: number }> = {
        2: { games: 0, wins: 0 },
        3: { games: 0, wins: 0 },
        4: { games: 0, wins: 0 },
      };

      for (const entry of user.gameEntries) {
        const playerCount = entry.game.players.length;
        if (playerCount >= 2 && playerCount <= 4) {
          byPlayerCount[playerCount].games++;
          if (entry.isWinner) {
            byPlayerCount[playerCount].wins++;
          }
        }

        if (entry.isWinner) {
          const label = getWinLabel(entry.game.players);
          if (label === "nice") niceWins++;
          else if (label === "big") bigWins++;
          else if (label === "easy") easyWins++;
        }
      }

      const totalGames = user.gameEntries.length;
      const totalWins = user.gameEntries.filter((e) => e.isWinner).length;

      const winRateByPlayerCount: Record<number, { games: number; wins: number; winRate: number }> = {};
      for (const count of [2, 3, 4]) {
        const stat = byPlayerCount[count];
        if (stat.games > 0) {
          winRateByPlayerCount[count] = {
            games: stat.games,
            wins: stat.wins,
            winRate: Math.round((stat.wins / stat.games) * 100),
          };
        }
      }

      return {
        id: user.id,
        name: user.name,
        games: totalGames,
        wins: totalWins,
        winRate: totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0,
        niceWins,
        bigWins,
        easyWins,
        winRateByPlayerCount,
      };
    })
    .sort((a, b) => b.winRate - a.winRate || b.wins - a.wins);

  const total = leaderboard.length;
  const paged = leaderboard.slice((page - 1) * perPage, page * perPage);

  return NextResponse.json({
    entries: paged,
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  });
}
