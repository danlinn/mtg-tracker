import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth-helpers";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const games = await prisma.game.findMany({
    where: { players: { some: { userId } } },
    include: {
      players: {
        include: {
          user: { select: { id: true, name: true } },
          deck: { select: { id: true, name: true, commander: true, edhp: true, bracket: true } },
        },
      },
    },
    orderBy: [{ playedAt: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(games);
}

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { playedAt, players, notes, asterisk } = await req.json();

  if (!players || players.length < 2 || players.length > 4) {
    return NextResponse.json(
      { error: "Games require 2-4 players" },
      { status: 400 }
    );
  }

  const winners = players.filter(
    (p: { isWinner: boolean }) => p.isWinner
  );
  if (winners.length !== 1) {
    return NextResponse.json(
      { error: "Exactly one winner required" },
      { status: 400 }
    );
  }

  const game = await prisma.game.create({
    data: {
      playedAt: playedAt ? new Date(playedAt) : new Date(),
      notes: notes?.trim() || null,
      asterisk: !!asterisk,
      players: {
        create: players.map(
          (p: { userId: string; deckId: string; isWinner: boolean }) => ({
            userId: p.userId,
            deckId: p.deckId,
            isWinner: p.isWinner,
          })
        ),
      },
    },
    include: {
      players: {
        include: {
          user: { select: { id: true, name: true } },
          deck: { select: { id: true, name: true, commander: true, edhp: true, bracket: true } },
        },
      },
    },
  });

  return NextResponse.json(game);
}
