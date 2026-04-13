import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth-helpers";

export async function GET(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const playgroupId = searchParams.get("playgroupId");

  // If playgroupId is "all" or missing, return all users
  // Otherwise filter to members of the given playgroup
  const where =
    playgroupId && playgroupId !== "all"
      ? { playgroupMembers: { some: { playgroupId } } }
      : {};

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      decks: {
        select: { id: true, name: true, commander: true, edhp: true, bracket: true },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
}
