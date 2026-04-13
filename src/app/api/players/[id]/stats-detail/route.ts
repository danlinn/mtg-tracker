import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { buildGamePlayerWhere } from "@/lib/playgroup";
import { getWinLabel } from "@/lib/win-labels";

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

  // Playgroup-scoped filter via current viewer's context
  const gamePlayerWhere = await buildGamePlayerWhere(currentUserId);

  // Fetch all the target user's game entries (scoped to viewer's playgroup context)
  const entries = await prisma.gamePlayer.findMany({
    where: { userId: id, ...gamePlayerWhere },
    select: {
      isWinner: true,
      deckId: true,
      deck: {
        select: {
          id: true,
          name: true,
          commander: true,
          colorW: true,
          colorU: true,
          colorB: true,
          colorR: true,
          colorG: true,
        },
      },
      game: {
        select: {
          id: true,
          playedAt: true,
          players: {
            select: {
              id: true,
              isWinner: true,
              userId: true,
              deck: {
                select: {
                  bracket: true,
                  edhp: true,
                  colorW: true,
                  colorU: true,
                  colorB: true,
                  colorR: true,
                  colorG: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { game: { playedAt: "asc" } },
  });

  // Flatten for client-side filtering
  const games = entries.map((e) => ({
    isWinner: e.isWinner,
    playedAt: e.game.playedAt,
    playerCount: e.game.players.length,
    deck: {
      id: e.deck.id,
      name: e.deck.name,
      commander: e.deck.commander,
      colors: {
        W: e.deck.colorW,
        U: e.deck.colorU,
        B: e.deck.colorB,
        R: e.deck.colorR,
        G: e.deck.colorG,
      },
    },
    winLabel: e.isWinner ? getWinLabel(e.game.players) : null,
  }));

  // All decks (so client can show filter options even for decks with no games)
  const decks = await prisma.deck.findMany({
    where: { userId: id },
    select: {
      id: true,
      name: true,
      commander: true,
      colorW: true,
      colorU: true,
      colorB: true,
      colorR: true,
      colorG: true,
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    user,
    games,
    decks: decks.map((d) => ({
      id: d.id,
      name: d.name,
      commander: d.commander,
      colors: {
        W: d.colorW,
        U: d.colorU,
        B: d.colorB,
        R: d.colorR,
        G: d.colorG,
      },
    })),
  });
}
