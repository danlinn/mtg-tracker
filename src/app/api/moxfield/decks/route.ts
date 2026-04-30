import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { moxfieldFetch } from "@/lib/moxfield";

export async function GET(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  let username = searchParams.get("username");

  if (!username) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { moxfieldUsername: true },
    });
    username = user?.moxfieldUsername ?? null;
  }

  if (!username) {
    return NextResponse.json(
      { error: "No Moxfield username set. Update your profile first." },
      { status: 400 }
    );
  }

  try {
    const res = await moxfieldFetch(
      `/v2/users/${encodeURIComponent(username)}/decks?pageNumber=1&pageSize=100&sortType=updated&sortDirection=Descending&fmt=commander`
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `Moxfield returned ${res.status}: ${text}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const decks = (data.data ?? []).map((d: Record<string, unknown>) => ({
      id: d.publicId ?? d.id,
      name: d.name,
      format: d.format,
      colorIdentity: d.colorIdentity,
      mainboardCount: d.mainboardCount,
      lastUpdatedAtUtc: d.lastUpdatedAtUtc,
      publicUrl: d.publicUrl,
    }));

    return NextResponse.json({ username, decks });
  } catch (error) {
    console.error("[GET /api/moxfield/decks] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch decks" },
      { status: 502 }
    );
  }
}
