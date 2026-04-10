import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { isPlaygroupMember } from "@/lib/playgroup";

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { playgroupId } = body;

  if (playgroupId && playgroupId !== "all") {
    const isMember = await isPlaygroupMember(userId, playgroupId);
    if (!isMember) {
      return NextResponse.json({ error: "Not a member of this playgroup" }, { status: 403 });
    }
  }

  const cookieStore = await cookies();
  cookieStore.set("mtg-active-playgroup", playgroupId ?? "all", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return NextResponse.json({ success: true, playgroupId: playgroupId ?? "all" });
}
