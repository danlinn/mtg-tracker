import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { getActivePlaygroupId, getPlaygroupIdsForUser } from "@/lib/playgroup";

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

  const activePlaygroupId = await getActivePlaygroupId();

  // Scope by playgroup: specific group, or all user's groups
  let playgroupFilter = {};
  if (activePlaygroupId) {
    playgroupFilter = { playgroupId: activePlaygroupId };
  } else {
    const pgIds = await getPlaygroupIdsForUser(userId);
    if (pgIds.length > 0) {
      playgroupFilter = { playgroupId: { in: pgIds } };
    }
  }

  const where = { players: { some: { userId } }, ...playgroupFilter };

  const [games, total] = await Promise.all([
    prisma.game.findMany({
      where,
      include: {
        players: {
          include: {
            user: { select: { id: true, name: true } },
            deck: { select: { id: true, name: true, commander: true, edhp: true, bracket: true } },
          },
        },
      },
      orderBy: [{ playedAt: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.game.count({ where }),
  ]);

  return NextResponse.json({
    games,
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  });
}

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { playedAt, players, notes, asterisk, playgroupId } = body;

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

  const gameDate = playedAt ? new Date(playedAt) : new Date();
  const deckIds = players.map((p: { deckId: string }) => p.deckId);

  try {
    const [game] = await prisma.$transaction([
      prisma.game.create({
        data: {
          playedAt: gameDate,
          notes: notes?.trim() || null,
          asterisk: !!asterisk,
          playgroupId: playgroupId || (await getActivePlaygroupId()) || null,
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
      }),
      ...deckIds.map((deckId: string) =>
        prisma.deck.update({
          where: { id: deckId },
          data: { lastPlayedAt: gameDate },
        })
      ),
    ]);

    return NextResponse.json(game);
  } catch (error) {
    console.error("[POST /api/games] Error:", error);
    return NextResponse.json(
      { error: "Failed to save game" },
      { status: 500 }
    );
  }
}
