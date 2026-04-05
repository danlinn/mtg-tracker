import { NextResponse } from "next/server";

const SCRYFALL_BASE = "https://api.scryfall.com";

interface ScryfallCard {
  name: string;
  mana_cost?: string;
  cmc?: number;
  type_line?: string;
  oracle_text?: string;
  power?: string;
  toughness?: string;
  colors?: string[];
  color_identity?: string[];
  rarity?: string;
  set_name?: string;
  image_uris?: { small?: string; normal?: string; art_crop?: string };
  card_faces?: { image_uris?: { small?: string; normal?: string; art_crop?: string } }[];
  prices?: { usd?: string | null; usd_foil?: string | null };
  scryfall_uri?: string;
  id?: string;
}

function stripSetCode(name: string): string {
  // Remove set code + collector number: "Sol Ring (C20) 225" -> "Sol Ring"
  // Also handles "Sol Ring (C20)" and "Sol Ring [C20] 225"
  return name.replace(/\s*[\(\[]\w+[\)\]]\s*\d*\s*$/, "").trim();
}

function parseDecklist(decklist: string): { quantity: number; name: string }[] {
  return decklist
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("//") && !line.startsWith("#"))
    .map((line) => {
      const match = line.match(/^(\d+)\s+(.+)$/);
      if (match) {
        return { quantity: parseInt(match[1]), name: stripSetCode(match[2]) };
      }
      return { quantity: 1, name: stripSetCode(line) };
    });
}

function getImageUris(card: ScryfallCard) {
  return card.image_uris ?? card.card_faces?.[0]?.image_uris;
}

export async function POST(req: Request) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { decklist } = body;
  if (!decklist || typeof decklist !== "string") {
    return NextResponse.json({ error: "decklist is required" }, { status: 400 });
  }

  const entries = parseDecklist(decklist);
  if (entries.length === 0) {
    return NextResponse.json({ cards: [], totalPrice: 0 });
  }

  // Scryfall collection endpoint accepts up to 75 cards per request
  const identifiers = entries.map((e) => ({ name: e.name }));
  const chunks: { name: string }[][] = [];
  for (let i = 0; i < identifiers.length; i += 75) {
    chunks.push(identifiers.slice(i, i + 75));
  }

  const allCards: ScryfallCard[] = [];
  for (const chunk of chunks) {
    try {
      const res = await fetch(`${SCRYFALL_BASE}/cards/collection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifiers: chunk }),
      });
      if (res.ok) {
        const data = await res.json();
        allCards.push(...(data.data ?? []));
      }
    } catch {
      // Skip failed chunks
    }
    // Scryfall asks for 50-100ms between requests
    if (chunks.length > 1) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  // Map cards by name for lookup
  const cardMap = new Map<string, ScryfallCard>();
  for (const card of allCards) {
    cardMap.set(card.name.toLowerCase(), card);
  }

  let totalPrice = 0;
  const cards = entries.map((entry) => {
    const card = cardMap.get(entry.name.toLowerCase());
    const imageUris = card ? getImageUris(card) : undefined;
    const priceUsd = card?.prices?.usd ? parseFloat(card.prices.usd) : null;
    const priceFoil = card?.prices?.usd_foil ? parseFloat(card.prices.usd_foil) : null;
    const unitPrice = priceUsd ?? priceFoil ?? null;
    if (unitPrice) totalPrice += unitPrice * entry.quantity;

    return {
      quantity: entry.quantity,
      name: entry.name,
      found: !!card,
      manaCost: card?.mana_cost ?? null,
      cmc: card?.cmc ?? null,
      typeLine: card?.type_line ?? null,
      oracleText: card?.oracle_text ?? null,
      power: card?.power ?? null,
      toughness: card?.toughness ?? null,
      rarity: card?.rarity ?? null,
      setName: card?.set_name ?? null,
      imageSmall: imageUris?.small ?? null,
      imageNormal: imageUris?.normal ?? null,
      priceUsd: priceUsd,
      priceFoil: priceFoil,
      scryfallUri: card?.scryfall_uri ?? null,
      scryfallId: card?.id ?? null,
    };
  });

  return NextResponse.json({
    cards,
    totalPrice: Math.round(totalPrice * 100) / 100,
    found: cards.filter((c) => c.found).length,
    notFound: cards.filter((c) => !c.found).length,
  });
}
