import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth-helpers";
import {
  fetchMoxfieldDeck,
  extractDecklistFromMoxfield,
  extractColorsFromMoxfield,
} from "@/lib/moxfield";

function parseMoxfieldUrl(input: string): string | null {
  const trimmed = input.trim();

  const urlMatch = trimmed.match(
    /moxfield\.com\/decks\/([a-zA-Z0-9_-]+)/
  );
  if (urlMatch) return urlMatch[1];

  if (/^[a-zA-Z0-9_-]+$/.test(trimmed)) return trimmed;

  return null;
}

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
    return NextResponse.json(
      { error: "url is required (Moxfield deck URL or ID)" },
      { status: 400 }
    );
  }

  const deckId = parseMoxfieldUrl(url);
  if (!deckId) {
    return NextResponse.json(
      { error: "Could not parse Moxfield deck ID from the provided URL" },
      { status: 400 }
    );
  }

  try {
    const deck = await fetchMoxfieldDeck(deckId);

    const commanders = Object.values(deck.commanders).map((c) => c.card.name);
    const decklist = extractDecklistFromMoxfield(deck);
    const colors = extractColorsFromMoxfield(deck);

    return NextResponse.json({
      name: deck.name,
      commanders,
      decklist,
      colors,
      moxfieldId: deck.id,
      publicUrl: deck.publicUrl,
    });
  } catch (error) {
    console.error("[POST /api/moxfield] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch deck from Moxfield";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
