import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth-helpers";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberships = await prisma.playgroupMember.findMany({
    where: { userId },
    include: {
      playgroup: {
        select: {
          id: true,
          name: true,
          description: true,
          _count: { select: { members: true, games: true } },
        },
      },
    },
    orderBy: { playgroup: { name: "asc" } },
  });

  const playgroups = memberships.map((m) => ({
    ...m.playgroup,
    role: m.role,
    memberCount: m.playgroup._count.members,
    gameCount: m.playgroup._count.games,
  }));

  return NextResponse.json(playgroups);
}
