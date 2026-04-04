import { NextResponse } from "next/server";

const SCRYFALL_BASE = "https://api.scryfall.com";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const name = searchParams.get("name");

  // Autocomplete: /api/cards?q=kren
  if (q) {
    const res = await fetch(
      `${SCRYFALL_BASE}/cards/autocomplete?q=${encodeURIComponent(q)}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) {
      return NextResponse.json({ data: [] });
    }
    const data = await res.json();
    return NextResponse.json({ data: data.data ?? [] });
  }

  // Named lookup: /api/cards?name=Krenko, Mob Boss
  if (name) {
    const res = await fetch(
      `${SCRYFALL_BASE}/cards/named?fuzzy=${encodeURIComponent(name)}`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) {
      return NextResponse.json({ card: null });
    }
    const card = await res.json();
    // Double-faced cards (with //) have images in card_faces instead of top-level
    const imageUris = card.image_uris ?? card.card_faces?.[0]?.image_uris;
    return NextResponse.json({
      card: {
        name: card.name,
        image: imageUris?.art_crop ?? imageUris?.normal ?? null,
        imageSmall: imageUris?.small ?? null,
        colors: card.color_identity ?? card.colors ?? [],
        type_line: card.type_line ?? "",
      },
    });
  }

  return NextResponse.json({ error: "Provide ?q= or ?name= parameter" }, { status: 400 });
}
