import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth-helpers";

export const lastCreateByUser = new Map<string, number>();
const DECK_CREATE_COOLDOWN_MS = 10_000;

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

  const where = { userId };

  const [decks, total] = await Promise.all([
    prisma.deck.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.deck.count({ where }),
  ]);

  return NextResponse.json({
    decks,
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

  const now = Date.now();
  const lastCreate = lastCreateByUser.get(userId) ?? 0;
  if (now - lastCreate < DECK_CREATE_COOLDOWN_MS) {
    const waitSec = Math.ceil((DECK_CREATE_COOLDOWN_MS - (now - lastCreate)) / 1000);
    return NextResponse.json(
      { error: `Please wait ${waitSec} seconds before creating another deck` },
      { status: 429 }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, commander, commanderImage, commander2, commander2Image, colors, bracket, edhp, decklist, forUserId } = body;

  if (!name || !commander) {
    return NextResponse.json(
      { error: "Name and commander are required" },
      { status: 400 }
    );
  }

  const ownerId = forUserId || userId;

  try {
    const deck = await prisma.deck.create({
      data: {
        name,
        commander,
        commanderImage: commanderImage ?? null,
        commander2: commander2?.trim() || null,
        commander2Image: commander2Image ?? null,
        bracket: bracket != null ? Number(bracket) : null,
        edhp: edhp != null ? Number(edhp) : null,
        decklist: decklist ?? null,
        colorW: colors?.W ?? false,
        colorU: colors?.U ?? false,
        colorB: colors?.B ?? false,
        colorR: colors?.R ?? false,
        colorG: colors?.G ?? false,
        userId: ownerId,
      },
    });

    lastCreateByUser.set(userId, Date.now());
    return NextResponse.json(deck);
  } catch (error) {
    console.error("[POST /api/decks] Error:", error);
    return NextResponse.json({ error: "Failed to create deck" }, { status: 500 });
  }
}
