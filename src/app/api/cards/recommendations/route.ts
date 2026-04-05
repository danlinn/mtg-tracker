import { NextResponse } from "next/server";

const SCRYFALL_BASE = "https://api.scryfall.com";

export async function POST(req: Request) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { commander, colors, excludeNames } = body;
  if (!commander) {
    return NextResponse.json({ error: "commander is required" }, { status: 400 });
  }

  // Build color identity filter: cards must be within the commander's colors
  const colorIdentity = (colors ?? []) as string[];
  const colorFilter = colorIdentity.length > 0
    ? `id<=${colorIdentity.join("")}`
    : "id<=C"; // colorless only

  // Search for popular EDH staples in these colors
  // Scryfall sorts by EDHREC rank when available
  const query = `f:commander ${colorFilter} -t:basic sort:edhrec`;

  try {
    const res = await fetch(
      `${SCRYFALL_BASE}/cards/search?q=${encodeURIComponent(query)}&order=edhrec&dir=asc&unique=cards`,
    );

    if (!res.ok) {
      return NextResponse.json({ cards: [] });
    }

    const data = await res.json();
    const excludeSet = new Set(
      (excludeNames ?? []).map((n: string) => n.toLowerCase())
    );

    const cards = (data.data ?? [])
      .filter((card: { name: string }) => !excludeSet.has(card.name.toLowerCase()))
      .slice(0, 30)
      .map((card: {
        name: string;
        mana_cost?: string;
        cmc?: number;
        type_line?: string;
        oracle_text?: string;
        rarity?: string;
        edhrec_rank?: number;
        image_uris?: { small?: string; normal?: string };
        card_faces?: { image_uris?: { small?: string; normal?: string } }[];
        prices?: { usd?: string | null; usd_foil?: string | null };
        scryfall_uri?: string;
      }) => {
        const imageUris = card.image_uris ?? card.card_faces?.[0]?.image_uris;
        return {
          name: card.name,
          manaCost: card.mana_cost ?? null,
          cmc: card.cmc ?? null,
          typeLine: card.type_line ?? null,
          rarity: card.rarity ?? null,
          edhrecRank: card.edhrec_rank ?? null,
          imageSmall: imageUris?.small ?? null,
          imageNormal: imageUris?.normal ?? null,
          priceUsd: card.prices?.usd ? parseFloat(card.prices.usd) : null,
          scryfallUri: card.scryfall_uri ?? null,
        };
      });

    return NextResponse.json({ cards });
  } catch {
    return NextResponse.json({ cards: [] });
  }
}
