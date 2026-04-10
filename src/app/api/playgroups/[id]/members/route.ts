import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, isAdmin } from "@/lib/auth-helpers";
import { isPlaygroupMember } from "@/lib/playgroup";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (!(await isAdmin()) && !(await isPlaygroupMember(userId, id))) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const members = await prisma.playgroupMember.findMany({
    where: { playgroupId: id },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { user: { name: "asc" } },
  });

  return NextResponse.json(
    members.map((m) => ({
      id: m.id,
      role: m.role,
      joinedAt: m.joinedAt,
      user: m.user,
    }))
  );
}
