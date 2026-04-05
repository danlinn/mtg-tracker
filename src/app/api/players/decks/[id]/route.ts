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

  const deck = await prisma.deck.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true } },
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
  });

  if (!deck) {
    return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  }

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

  return NextResponse.json({
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
    decklist: deck.decklist,
    games: totalEntries,
    wins: totalWins,
    winRate: totalEntries > 0 ? Math.round((totalWins / totalEntries) * 100) : 0,
    winRateByPlayerCount,
    owner: deck.user,
  });
}
