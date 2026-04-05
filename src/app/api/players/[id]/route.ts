import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth-helpers";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  const [totalGames, wins, decks] = await Promise.all([
    prisma.gamePlayer.count({ where: { userId: id } }),
    prisma.gamePlayer.count({ where: { userId: id, isWinner: true } }),
    prisma.deck.findMany({
      where: { userId: id },
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
      commander2: deck.commander2,
      commanderImage: deck.commanderImage,
      commander2Image: deck.commander2Image,
      colorW: deck.colorW,
      colorU: deck.colorU,
      colorB: deck.colorB,
      colorR: deck.colorR,
      colorG: deck.colorG,
      bracket: deck.bracket,
      edhp: deck.edhp,
      games: totalEntries,
      wins: totalWins,
      winRate:
        totalEntries > 0 ? Math.round((totalWins / totalEntries) * 100) : 0,
      winRateByPlayerCount,
      lastPlayedAt: deck.lastPlayedAt?.toISOString() ?? null,
    };
  });

  deckStats.sort((a, b) => {
    if (!a.lastPlayedAt && !b.lastPlayedAt) return 0;
    if (!a.lastPlayedAt) return 1;
    if (!b.lastPlayedAt) return -1;
    return new Date(b.lastPlayedAt).getTime() - new Date(a.lastPlayedAt).getTime();
  });

  return NextResponse.json({
    id: user.id,
    name: user.name,
    totalGames,
    wins,
    losses: totalGames - wins,
    winRate: totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0,
    deckStats,
  });
}
