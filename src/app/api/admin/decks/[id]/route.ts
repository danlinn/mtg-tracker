import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth-helpers";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const deck = await prisma.deck.findUnique({ where: { id } });
  if (!deck) {
    return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, commander, colors } = body;

  try {
    const updated = await prisma.deck.update({
      where: { id },
      data: {
        name: name ?? deck.name,
        commander: commander ?? deck.commander,
        colorW: colors?.W ?? deck.colorW,
        colorU: colors?.U ?? deck.colorU,
        colorB: colors?.B ?? deck.colorB,
        colorR: colors?.R ?? deck.colorR,
        colorG: colors?.G ?? deck.colorG,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PUT /api/admin/decks/[id]] Error:", error);
    return NextResponse.json({ error: "Failed to update deck" }, { status: 500 });
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
  const deck = await prisma.deck.findUnique({ where: { id } });
  if (!deck) {
    return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  }

  try {
    await prisma.deck.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/admin/decks/[id]] Error:", error);
    return NextResponse.json({ error: "Failed to delete deck" }, { status: 500 });
  }
}
