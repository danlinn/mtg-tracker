import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth-helpers";

export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const decks = await prisma.deck.findMany({
    where: {
      lastPlayedAt: null,
      gameEntries: { some: {} },
    },
    select: {
      id: true,
      name: true,
      gameEntries: {
        select: {
          game: { select: { playedAt: true } },
        },
        orderBy: { game: { playedAt: "desc" } },
        take: 1,
      },
    },
  });

  const updated: string[] = [];

  for (const deck of decks) {
    const lastGame = deck.gameEntries[0];
    if (!lastGame) continue;

    await prisma.deck.update({
      where: { id: deck.id },
      data: { lastPlayedAt: lastGame.game.playedAt },
    });
    updated.push(deck.name);
  }

  return NextResponse.json({
    message: `Backfilled ${updated.length} deck(s)`,
    decks: updated,
  });
}
