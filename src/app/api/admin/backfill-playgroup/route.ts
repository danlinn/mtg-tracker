import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth-helpers";

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { playgroupId } = body;

  if (!playgroupId) {
    return NextResponse.json({ error: "playgroupId is required" }, { status: 400 });
  }

  const playgroup = await prisma.playgroup.findUnique({ where: { id: playgroupId } });
  if (!playgroup) {
    return NextResponse.json({ error: "Playgroup not found" }, { status: 404 });
  }

  const result = await prisma.game.updateMany({
    where: { playgroupId: null },
    data: { playgroupId },
  });

  return NextResponse.json({
    message: `Assigned ${result.count} unassigned game(s) to "${playgroup.name}"`,
    count: result.count,
  });
}
