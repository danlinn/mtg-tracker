import { NextResponse } from "next/server";

const SCRYFALL_BASE = "https://api.scryfall.com";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id parameter required" }, { status: 400 });
  }

  try {
    const res = await fetch(`${SCRYFALL_BASE}/cards/${encodeURIComponent(id)}/rulings`);
    if (!res.ok) {
      return NextResponse.json({ rulings: [] });
    }
    const data = await res.json();
    const rulings = (data.data ?? []).map((r: { source: string; published_at: string; comment: string }) => ({
      source: r.source,
      publishedAt: r.published_at,
      comment: r.comment,
    }));
    return NextResponse.json({ rulings });
  } catch {
    return NextResponse.json({ rulings: [] });
  }
}
