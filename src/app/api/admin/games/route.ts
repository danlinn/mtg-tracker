import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth-helpers";

export async function GET(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const perPage = Math.min(Number(searchParams.get("perPage") ?? "50"), 200);

  const games = await prisma.game.findMany({
    include: {
      playgroup: { select: { id: true, name: true } },
      players: {
        include: {
          user: { select: { id: true, name: true } },
          deck: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: [{ playedAt: "desc" }, { createdAt: "desc" }],
    take: perPage,
  });

  return NextResponse.json({
    games: games.map((g) => ({
      id: g.id,
      playedAt: g.playedAt,
      playgroupId: g.playgroup?.id ?? null,
      playgroupName: g.playgroup?.name ?? null,
      notes: g.notes,
      players: g.players.map((p) => ({
        userId: p.user.id,
        userName: p.user.name,
        deckName: p.deck.name,
        isWinner: p.isWinner,
      })),
    })),
  });
}
