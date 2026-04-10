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

  const { playgroupId, addAllUsers } = body;

  if (!playgroupId) {
    return NextResponse.json({ error: "playgroupId is required" }, { status: 400 });
  }

  const playgroup = await prisma.playgroup.findUnique({ where: { id: playgroupId } });
  if (!playgroup) {
    return NextResponse.json({ error: "Playgroup not found" }, { status: 404 });
  }

  // Assign unassigned games to this playgroup
  const gameResult = await prisma.game.updateMany({
    where: { playgroupId: null },
    data: { playgroupId },
  });

  let membersAdded = 0;
  let usersApproved = 0;

  // Optionally add all existing users as members
  if (addAllUsers) {
    const users = await prisma.user.findMany({ select: { id: true, status: true } });

    for (const user of users) {
      const existing = await prisma.playgroupMember.findUnique({
        where: { userId_playgroupId: { userId: user.id, playgroupId } },
      });
      if (!existing) {
        await prisma.playgroupMember.create({
          data: { userId: user.id, playgroupId, role: "member" },
        });
        membersAdded++;
      }
      if (user.status !== "approved") {
        await prisma.user.update({
          where: { id: user.id },
          data: { status: "approved" },
        });
        usersApproved++;
      }
    }
  }

  return NextResponse.json({
    message: `Assigned ${gameResult.count} game(s) to "${playgroup.name}"`,
    gamesAssigned: gameResult.count,
    membersAdded,
    usersApproved,
  });
}
