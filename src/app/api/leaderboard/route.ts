import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth-helpers";

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

  // Get all users who have played at least one game, with aggregated stats
  const users = await prisma.user.findMany({
    where: { gameEntries: { some: {} } },
    select: {
      id: true,
      name: true,
      _count: { select: { gameEntries: true } },
      gameEntries: {
        where: { isWinner: true },
        select: { id: true },
      },
    },
  });

  const leaderboard = users
    .map((user) => ({
      id: user.id,
      name: user.name,
      games: user._count.gameEntries,
      wins: user.gameEntries.length,
      winRate:
        user._count.gameEntries > 0
          ? Math.round((user.gameEntries.length / user._count.gameEntries) * 100)
          : 0,
    }))
    .sort((a, b) => b.wins - a.wins || b.winRate - a.winRate);

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
