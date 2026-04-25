import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { getActivePlaygroupId, getPlaygroupIdsForUser, buildGameWhere } from "@/lib/playgroup";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, status: true },
  });

  const memberships = await prisma.playgroupMember.findMany({
    where: { userId },
    include: { playgroup: { select: { id: true, name: true } } },
  });

  const activePlaygroupId = await getActivePlaygroupId();
  const pgIds = await getPlaygroupIdsForUser(userId);
  const gameWhere = await buildGameWhere(userId);

  const totalGamesInDb = await prisma.game.count();
  const myGamesAsPlayer = await prisma.gamePlayer.count({ where: { userId } });
  const myGamesWithScope = await prisma.game.count({
    where: { players: { some: { userId } }, ...gameWhere },
  });
  const gamesInMyPlaygroups = pgIds.length > 0
    ? await prisma.game.count({ where: { playgroupId: { in: pgIds } } })
    : 0;
  const unassignedGames = await prisma.game.count({ where: { playgroupId: null } });

  const recentGames = await prisma.game.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      playedAt: true,
      playgroupId: true,
      players: {
        select: {
          userId: true,
          user: { select: { name: true } },
          isWinner: true,
        },
      },
    },
  });

  return NextResponse.json({
    currentUser: user,
    activePlaygroupCookie: activePlaygroupId ?? "all/null",
    playgroupMemberships: memberships.map((m) => ({
      playgroupId: m.playgroupId,
      playgroupName: m.playgroup.name,
      role: m.role,
    })),
    pgIdsForScoping: pgIds,
    resolvedGameWhere: gameWhere,
    counts: {
      totalGamesInDb,
      myGamesAsPlayer,
      myGamesWithScope,
      gamesInMyPlaygroups,
      unassignedGames,
    },
    recentGames: recentGames.map((g) => ({
      id: g.id,
      playedAt: g.playedAt,
      playgroupId: g.playgroupId,
      players: g.players.map((p) => ({
        name: p.user.name,
        userId: p.userId,
        isWinner: p.isWinner,
        isMe: p.userId === userId,
      })),
    })),
  });
}
