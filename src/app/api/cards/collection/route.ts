import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SCRYFALL_BASE = "https://api.scryfall.com";
const CACHE_TTL_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

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
  card_faces?: {
    name?: string;
    mana_cost?: string;
    type_line?: string;
    oracle_text?: string;
    power?: string;
    toughness?: string;
    image_uris?: { small?: string; normal?: string; art_crop?: string };
  }[];
  prices?: { usd?: string | null; usd_foil?: string | null };
  scryfall_uri?: string;
  id?: string;
}

function stripSetCode(name: string): string {
  return name
    .replace(/\s*\*[fF]\*\s*$/, "")            // Remove foil marker *F*
    .replace(/\s*[\(\[]\w+[\)\]]\s*\d*\s*$/, "") // Remove set code (C21) 7
    .trim();
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

function cardToResult(card: ScryfallCard | null, entry: { quantity: number; name: string }) {
  const frontUris = card ? getImageUris(card) : undefined;
  const backUris = card?.card_faces?.[1]?.image_uris;
  const priceUsd = card?.prices?.usd ? parseFloat(card.prices.usd) : null;
  const priceFoil = card?.prices?.usd_foil ? parseFloat(card.prices.usd_foil) : null;
  const frontFace = card?.card_faces?.[0];
  const backFace = card?.card_faces?.[1];

  return {
    quantity: entry.quantity,
    name: entry.name,
    found: !!card,
    manaCost: card?.mana_cost ?? frontFace?.mana_cost ?? null,
    cmc: card?.cmc ?? null,
    typeLine: card?.type_line ?? null,
    oracleText: card?.oracle_text ?? frontFace?.oracle_text ?? null,
    power: card?.power ?? frontFace?.power ?? null,
    toughness: card?.toughness ?? frontFace?.toughness ?? null,
    rarity: card?.rarity ?? null,
    setName: card?.set_name ?? null,
    imageSmall: frontUris?.small ?? null,
    imageNormal: frontUris?.normal ?? null,
    backImageSmall: backUris?.small ?? null,
    backImageNormal: backUris?.normal ?? null,
    backName: backFace?.name ?? null,
    backOracleText: backFace?.oracle_text ?? null,
    backTypeLine: backFace?.type_line ?? null,
    backPower: backFace?.power ?? null,
    backToughness: backFace?.toughness ?? null,
    priceUsd,
    priceFoil,
    scryfallUri: card?.scryfall_uri ?? null,
    scryfallId: card?.id ?? null,
  };
}

async function getCachedCard(name: string): Promise<ScryfallCard | null> {
  try {
    const cached = await prisma.cardCache.findUnique({
      where: { name: name.toLowerCase() },
    });
    if (cached && Date.now() - cached.fetchedAt.getTime() < CACHE_TTL_MS) {
      return JSON.parse(cached.data);
    }
  } catch {
    // Cache miss
  }
  return null;
}

async function cacheCard(name: string, card: ScryfallCard): Promise<void> {
  try {
    await prisma.cardCache.upsert({
      where: { name: name.toLowerCase() },
      update: { data: JSON.stringify(card), fetchedAt: new Date() },
      create: { name: name.toLowerCase(), data: JSON.stringify(card) },
    });
  } catch {
    // Non-critical
  }
}

async function fetchPricedPrinting(name: string): Promise<ScryfallCard | null> {
  try {
    // Search for the cheapest printing that has a USD price
    const query = `!"${name}" usd>0`;
    const res = await fetch(
      `${SCRYFALL_BASE}/cards/search?q=${encodeURIComponent(query)}&order=usd&dir=asc&unique=prints`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.data?.[0] ?? null;
  } catch {
    return null;
  }
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

  // Check cache first
  const uniqueNames = [...new Set(entries.map((e) => e.name.toLowerCase()))];
  const cardMap = new Map<string, ScryfallCard>();
  const uncachedNames: string[] = [];

  for (const name of uniqueNames) {
    const cached = await getCachedCard(name);
    if (cached) {
      cardMap.set(name, cached);
      // Also map front face name for DFCs
      if (cached.name.includes("//")) {
        const frontName = cached.name.split("//")[0].trim().toLowerCase();
        if (!cardMap.has(frontName)) cardMap.set(frontName, cached);
      }
    } else {
      uncachedNames.push(name);
    }
  }

  // Fetch uncached cards from Scryfall collection endpoint
  if (uncachedNames.length > 0) {
    const identifiers = uncachedNames.map((n) => ({ name: n }));
    const chunks: { name: string }[][] = [];
    for (let i = 0; i < identifiers.length; i += 75) {
      chunks.push(identifiers.slice(i, i + 75));
    }

    for (const chunk of chunks) {
      try {
        const res = await fetch(`${SCRYFALL_BASE}/cards/collection`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifiers: chunk }),
        });
        if (res.ok) {
          const data = await res.json();
          for (const card of (data.data ?? []) as ScryfallCard[]) {
            cardMap.set(card.name.toLowerCase(), card);
            if (card.name.includes("//")) {
              const frontName = card.name.split("//")[0].trim().toLowerCase();
              if (!cardMap.has(frontName)) cardMap.set(frontName, card);
            }
            // Cache it
            cacheCard(card.name, card);
            if (card.name.includes("//")) {
              cacheCard(card.name.split("//")[0].trim(), card);
            }
          }
        }
      } catch {
        // Skip
      }
      if (chunks.length > 1) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
  }

  // Retry priceless cards with named search for latest printing
  const pricelessNames: string[] = [];
  for (const entry of entries) {
    const card = cardMap.get(entry.name.toLowerCase());
    if (card && !card.prices?.usd && !card.prices?.usd_foil) {
      pricelessNames.push(entry.name);
    }
  }

  // Batch retry (limit to 10 to avoid timeout)
  for (const name of pricelessNames.slice(0, 10)) {
    const latest = await fetchPricedPrinting(name);
    if (latest && (latest.prices?.usd || latest.prices?.usd_foil)) {
      cardMap.set(name.toLowerCase(), latest);
      cacheCard(name, latest);
      if (latest.name.includes("//")) {
        const frontName = latest.name.split("//")[0].trim().toLowerCase();
        cardMap.set(frontName, latest);
        cacheCard(frontName, latest);
      }
    }
    await new Promise((r) => setTimeout(r, 75));
  }

  // Build results
  let totalPrice = 0;
  const cards = entries.map((entry) => {
    const card = cardMap.get(entry.name.toLowerCase()) ?? null;
    const result = cardToResult(card, entry);
    const unitPrice = result.priceUsd ?? result.priceFoil ?? null;
    if (unitPrice) totalPrice += unitPrice * entry.quantity;
    return result;
  });

  return NextResponse.json({
    cards,
    totalPrice: Math.round(totalPrice * 100) / 100,
    found: cards.filter((c) => c.found).length,
    notFound: cards.filter((c) => !c.found).length,
  });
}
