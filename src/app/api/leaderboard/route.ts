import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth-helpers";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      gameEntries: {
        select: { isWinner: true },
      },
    },
  });

  const leaderboard = users
    .map((user) => ({
      id: user.id,
      name: user.name,
      games: user.gameEntries.length,
      wins: user.gameEntries.filter((e) => e.isWinner).length,
      winRate:
        user.gameEntries.length > 0
          ? Math.round(
              (user.gameEntries.filter((e) => e.isWinner).length /
                user.gameEntries.length) *
                100
            )
          : 0,
    }))
    .filter((u) => u.games > 0)
    .sort((a, b) => b.wins - a.wins || b.winRate - a.winRate);

  return NextResponse.json(leaderboard);
}
