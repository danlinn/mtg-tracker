import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth-helpers";

export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { count } = await prisma.cardCache.deleteMany({});

  return NextResponse.json({
    message: `Cleared ${count} cached card(s)`,
  });
}
