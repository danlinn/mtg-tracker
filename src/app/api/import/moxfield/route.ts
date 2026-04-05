import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth-helpers";

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

  const { url } = body;
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  // Extract deck ID from Moxfield URL
  // Formats: https://www.moxfield.com/decks/{id} or just the id
  const match = url.match(/moxfield\.com\/decks\/([a-zA-Z0-9_-]+)/) ?? url.match(/^([a-zA-Z0-9_-]+)$/);
  if (!match) {
    return NextResponse.json({ error: "Invalid Moxfield URL" }, { status: 400 });
  }

  const deckId = match[1];

  try {
    const res = await fetch(`https://api2.moxfield.com/v3/decks/all/${deckId}`, {
      headers: {
        "User-Agent": "MTGCommanderTracker/1.0",
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Could not fetch deck from Moxfield. Make sure it's public." },
        { status: 404 }
      );
    }

    const data = await res.json();

    // Build decklist from mainboard
    const mainboard = data.boards?.mainboard?.cards ?? {};
    const lines: string[] = [];
    for (const [, entry] of Object.entries(mainboard) as [string, { quantity: number; card: { name: string } }][]) {
      lines.push(`${entry.quantity} ${entry.card.name}`);
    }

    // Get commanders
    const commanderBoard = data.boards?.commanders?.cards ?? {};
    const commanders = Object.values(commanderBoard).map(
      (entry: unknown) => (entry as { card: { name: string } }).card.name
    );

    // Get color identity from commanders
    const colorIdentity: string[] = [];
    for (const entry of Object.values(commanderBoard) as { card: { color_identity?: string[] } }[]) {
      if (entry.card.color_identity) {
        for (const c of entry.card.color_identity) {
          if (!colorIdentity.includes(c)) colorIdentity.push(c);
        }
      }
    }

    return NextResponse.json({
      name: data.name ?? "",
      commanders,
      colorIdentity,
      decklist: lines.join("\n"),
      cardCount: lines.reduce((sum, l) => {
        const m = l.match(/^(\d+)/);
        return sum + (m ? parseInt(m[1]) : 1);
      }, 0),
      moxfieldUrl: `https://www.moxfield.com/decks/${deckId}`,
    });
  } catch (error) {
    console.error("[POST /api/import/moxfield] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch from Moxfield" },
      { status: 500 }
    );
  }
}
