import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth-helpers";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const deck = await prisma.deck.findUnique({ where: { id } });

  if (!deck || deck.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(deck);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const deck = await prisma.deck.findUnique({ where: { id } });

  if (!deck || deck.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, commander, commanderImage, commander2, commander2Image, colors, bracket, edhp, decklist } = body;

  try {
    const updated = await prisma.deck.update({
      where: { id },
      data: {
        name: name ?? deck.name,
        commander: commander ?? deck.commander,
        commanderImage: commanderImage !== undefined ? commanderImage : deck.commanderImage,
        commander2: commander2 !== undefined ? (commander2?.trim() || null) : deck.commander2,
        commander2Image: commander2Image !== undefined ? commander2Image : deck.commander2Image,
        bracket: bracket !== undefined ? (bracket != null ? Number(bracket) : null) : deck.bracket,
        edhp: edhp !== undefined ? (edhp != null ? Number(edhp) : null) : deck.edhp,
        decklist: decklist !== undefined ? decklist : deck.decklist,
        colorW: colors?.W ?? deck.colorW,
        colorU: colors?.U ?? deck.colorU,
        colorB: colors?.B ?? deck.colorB,
        colorR: colors?.R ?? deck.colorR,
        colorG: colors?.G ?? deck.colorG,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PUT /api/decks/[id]] Error:", error);
    return NextResponse.json({ error: "Failed to update deck" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const deck = await prisma.deck.findUnique({ where: { id } });

  if (!deck || deck.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await prisma.deck.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/decks/[id]] Error:", error);
    return NextResponse.json({ error: "Failed to delete deck" }, { status: 500 });
  }
}
