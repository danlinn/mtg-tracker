const MOXFIELD_BASE = "https://api2.moxfield.com";
const MIN_INTERVAL_MS = 1500; // 1 request per 1.5 seconds

let lastRequestTime = 0;

function getUserAgent(): string {
  const key = process.env.MOXFIELD_USER_AGENT;
  if (!key) {
    throw new Error("MOXFIELD_USER_AGENT is not set");
  }
  return key;
}

async function throttle(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise((resolve) => setTimeout(resolve, MIN_INTERVAL_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

export async function moxfieldFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  await throttle();

  const url = `${MOXFIELD_BASE}${path}`;
  const headers = new Headers(options.headers);
  headers.set("User-Agent", getUserAgent());
  headers.set("Accept", "application/json");

  const res = await fetch(url, {
    ...options,
    headers,
  });

  return res;
}

export interface MoxfieldDeck {
  id: string;
  name: string;
  publicUrl: string;
  mainboard: Record<string, MoxfieldCard>;
  commanders: Record<string, MoxfieldCard>;
  companions: Record<string, MoxfieldCard>;
}

export interface MoxfieldCard {
  quantity: number;
  card: {
    name: string;
    scryfall_id: string;
    type_line: string;
    mana_cost: string;
    colors: string[];
    color_identity: string[];
  };
}

export async function fetchMoxfieldDeck(deckId: string): Promise<MoxfieldDeck> {
  const res = await moxfieldFetch(`/v2/decks/all/${deckId}`);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Moxfield API error ${res.status}: ${text}`);
  }
  return res.json();
}

export function extractDecklistFromMoxfield(deck: MoxfieldDeck): string {
  const lines: string[] = [];

  if (Object.keys(deck.commanders).length > 0) {
    for (const [, entry] of Object.entries(deck.commanders)) {
      lines.push(`${entry.quantity} ${entry.card.name}`);
    }
    lines.push("");
  }

  if (Object.keys(deck.companions).length > 0) {
    lines.push("// Companion");
    for (const [, entry] of Object.entries(deck.companions)) {
      lines.push(`${entry.quantity} ${entry.card.name}`);
    }
    lines.push("");
  }

  for (const [, entry] of Object.entries(deck.mainboard)) {
    lines.push(`${entry.quantity} ${entry.card.name}`);
  }

  return lines.join("\n");
}

export function extractColorsFromMoxfield(
  deck: MoxfieldDeck
): { W: boolean; U: boolean; B: boolean; R: boolean; G: boolean } {
  const colors = { W: false, U: false, B: false, R: false, G: false };
  const allCards = [
    ...Object.values(deck.commanders),
    ...Object.values(deck.companions),
  ];
  for (const entry of allCards) {
    for (const c of entry.card.color_identity) {
      if (c in colors) colors[c as keyof typeof colors] = true;
    }
  }
  return colors;
}
