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

  // Build game filter at DB level
  let gameWhere: Record<string, unknown> = {};
  if (activePlaygroupId) {
    gameWhere = { playgroupId: activePlaygroupId };
  } else {
    const pgIds = await getPlaygroupIdsForUser(userId);
    if (pgIds.length > 0) {
      // Games in user's groups OR unassigned (null)
      gameWhere = { OR: [{ playgroupId: { in: pgIds } }, { playgroupId: null }] };
    }
    // else: no playgroups = no filter, show everything
  }

  // Get all game entries matching the playgroup filter, grouped by user
  const entries = await prisma.gamePlayer.findMany({
    where: {
      game: gameWhere,
    },
    select: {
      isWinner: true,
      userId: true,
      user: { select: { id: true, name: true } },
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
  });

  // Group by user
  const userMap = new Map<string, {
    name: string;
    entries: typeof entries;
  }>();

  for (const entry of entries) {
    const existing = userMap.get(entry.userId);
    if (existing) {
      existing.entries.push(entry);
    } else {
      userMap.set(entry.userId, {
        name: entry.user.name,
        entries: [entry],
      });
    }
  }

  const leaderboard = Array.from(userMap.entries())
    .map(([id, { name, entries: userEntries }]) => {
      let niceWins = 0;
      let bigWins = 0;
      let easyWins = 0;

      const byPlayerCount: Record<number, { games: number; wins: number }> = {
        2: { games: 0, wins: 0 },
        3: { games: 0, wins: 0 },
        4: { games: 0, wins: 0 },
      };

      for (const entry of userEntries) {
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

      const totalGames = userEntries.length;
      const totalWins = userEntries.filter((e) => e.isWinner).length;

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
        id,
        name,
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
