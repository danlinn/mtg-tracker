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

  const { name, commander, colors } = await req.json();

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

  await prisma.deck.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
