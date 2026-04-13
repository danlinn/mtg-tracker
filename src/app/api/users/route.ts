import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth-helpers";
import {
  getActivePlaygroupId,
  getPlaygroupIdsForUser,
} from "@/lib/playgroup";

export async function GET(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  // Explicit override: ?playgroupId=X or ?playgroupId=all
  const override = searchParams.get("playgroupId");

  // Default: respect the active playgroup from cookie context, same as
  // all other scoped queries. "all" skips filtering entirely.
  let scopeId: string | null;
  if (override) {
    scopeId = override === "all" ? null : override;
  } else {
    scopeId = await getActivePlaygroupId();
  }

  let where = {};
  if (scopeId) {
    // Specific playgroup: only members of that group
    where = { playgroupMembers: { some: { playgroupId: scopeId } } };
  } else if (override !== "all") {
    // "All Groups" active (or no cookie) — scope to the current viewer's
    // playgroups so we don't leak users from unrelated groups.
    const pgIds = await getPlaygroupIdsForUser(userId);
    if (pgIds.length > 0) {
      where = {
        OR: [
          { playgroupMembers: { some: { playgroupId: { in: pgIds } } } },
          // Always include self even if not in any group yet
          { id: userId },
        ],
      };
    }
    // If the user has no playgroups and no override, return all users
    // (first-time user seeding — same behavior as leaderboard).
  }

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
