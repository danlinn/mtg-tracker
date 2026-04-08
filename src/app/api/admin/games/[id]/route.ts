import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth-helpers";

const gameInclude = {
  players: {
    include: {
      user: { select: { id: true, name: true } },
      deck: { select: { id: true, name: true, commander: true, edhp: true, bracket: true } },
    },
  },
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const game = await prisma.game.findUnique({
    where: { id },
    include: gameInclude,
  });

  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  return NextResponse.json(game);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.game.findUnique({
    where: { id },
    include: { players: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { playedAt, players, notes, asterisk } = body;

  try {
    if (players) {
      if (players.length < 2 || players.length > 4) {
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

      // Delete existing players and recreate
      await prisma.gamePlayer.deleteMany({ where: { gameId: id } });

      await prisma.game.update({
        where: { id },
        data: {
          playedAt: playedAt ? new Date(playedAt) : undefined,
          notes: notes !== undefined ? (notes?.trim() || null) : undefined,
          asterisk: asterisk !== undefined ? !!asterisk : undefined,
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
      });
    } else {
      // Update only game metadata
      await prisma.game.update({
        where: { id },
        data: {
          ...(playedAt ? { playedAt: new Date(playedAt) } : {}),
          ...(notes !== undefined ? { notes: notes?.trim() || null } : {}),
          ...(asterisk !== undefined ? { asterisk: !!asterisk } : {}),
        },
      });
    }

    const updated = await prisma.game.findUnique({
      where: { id },
      include: gameInclude,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PUT /api/admin/games/[id]] Error:", error);
    return NextResponse.json({ error: "Failed to update game" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.game.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  try {
    await prisma.game.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/admin/games/[id]] Error:", error);
    return NextResponse.json({ error: "Failed to delete game" }, { status: 500 });
  }
}
