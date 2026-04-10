import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUserId } from "@/lib/auth-helpers";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cookieStore = await cookies();
  const active = cookieStore.get("mtg-active-playgroup")?.value ?? "all";

  return NextResponse.json({ playgroupId: active });
}
