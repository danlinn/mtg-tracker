import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth-helpers";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      decks: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: targetUserId } = await params;

  const user = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    name,
    commander,
    commanderImage,
    commander2,
    commander2Image,
    colors,
    bracket,
    edhp,
    decklist,
  } = body;

  if (!name || !commander) {
    return NextResponse.json(
      { error: "Name and commander are required" },
      { status: 400 }
    );
  }

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
        userId: targetUserId,
      },
    });

    return NextResponse.json(deck);
  } catch (error) {
    console.error("[POST /api/admin/users/[id]/decks] Error:", error);
    return NextResponse.json(
      { error: "Failed to create deck" },
      { status: 500 }
    );
  }
}
