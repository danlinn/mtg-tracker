import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

const mockCacheFindUnique = jest.fn();
const mockCacheUpsert = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    cardCache: {
      findUnique: (...args: unknown[]) => mockCacheFindUnique(...args),
      upsert: (...args: unknown[]) => mockCacheUpsert(...args),
    },
  },
}));

async function getHandler() {
  const mod = await import("@/app/api/cards/collection/route");
  return mod.POST;
}

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/cards/collection", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/cards/collection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCacheFindUnique.mockResolvedValue(null); // no cache by default
    mockCacheUpsert.mockResolvedValue({});
  });

  it("returns 400 with no decklist", async () => {
    const POST = await getHandler();
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns empty for empty decklist", async () => {
    const POST = await getHandler();
    const res = await POST(makeRequest({ decklist: "" }));
    expect(res.status).toBe(400);
  });

  it("parses decklist with quantities", async () => {
    const POST = await getHandler();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            name: "Sol Ring",
            mana_cost: "{1}",
            cmc: 1,
            type_line: "Artifact",
            oracle_text: "{T}: Add {C}{C}.",
            rarity: "uncommon",
            image_uris: { small: "http://img/small", normal: "http://img/normal" },
            prices: { usd: "2.50", usd_foil: "5.00" },
            scryfall_uri: "http://scryfall/sol-ring",
            id: "abc123",
          },
          {
            name: "Command Tower",
            mana_cost: "",
            cmc: 0,
            type_line: "Land",
            rarity: "common",
            image_uris: { small: "http://img/ct-small", normal: "http://img/ct-normal" },
            prices: { usd: "0.25", usd_foil: null },
            scryfall_uri: "http://scryfall/command-tower",
            id: "def456",
          },
        ],
      }),
    });

    const res = await POST(makeRequest({ decklist: "2 Sol Ring\n1 Command Tower" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.cards).toHaveLength(2);
    expect(data.cards[0].name).toBe("Sol Ring");
    expect(data.cards[0].quantity).toBe(2);
    expect(data.cards[0].imageSmall).toBe("http://img/small");
    expect(data.cards[0].imageNormal).toBe("http://img/normal");
    expect(data.cards[0].priceUsd).toBe(2.5);
    expect(data.cards[0].priceFoil).toBe(5.0);
    expect(data.cards[0].scryfallId).toBe("abc123");
    expect(data.cards[1].name).toBe("Command Tower");
    expect(data.cards[1].quantity).toBe(1);
    // Total: 2x2.50 + 1x0.25 = 5.25
    expect(data.totalPrice).toBe(5.25);
    expect(data.found).toBe(2);
    expect(data.notFound).toBe(0);
  });

  it("handles cards without quantities", async () => {
    const POST = await getHandler();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ name: "Sol Ring", prices: { usd: "2.00" }, image_uris: { small: "http://img" }, id: "abc" }],
      }),
    });

    const res = await POST(makeRequest({ decklist: "Sol Ring" }));
    const data = await res.json();
    expect(data.cards[0].quantity).toBe(1);
    expect(data.totalPrice).toBe(2.0);
  });

  it("handles not-found cards gracefully", async () => {
    const POST = await getHandler();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });

    const res = await POST(makeRequest({ decklist: "1 Nonexistent Card" }));
    const data = await res.json();
    expect(data.cards).toHaveLength(1);
    expect(data.cards[0].found).toBe(false);
    expect(data.cards[0].imageSmall).toBeNull();
    expect(data.cards[0].priceUsd).toBeNull();
    expect(data.notFound).toBe(1);
    expect(data.totalPrice).toBe(0);
  });

  it("handles double-faced cards", async () => {
    const POST = await getHandler();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{
          name: "Delver of Secrets // Insectile Aberration",
          card_faces: [{ image_uris: { small: "http://img/front", normal: "http://img/front-n" } }],
          prices: { usd: "1.00" },
          id: "dfc123",
        }],
      }),
    });

    const res = await POST(makeRequest({ decklist: "1 Delver of Secrets // Insectile Aberration" }));
    const data = await res.json();
    expect(data.cards[0].imageSmall).toBe("http://img/front");
  });

  it("handles split cards like Fire // Ice (image_uris at top level)", async () => {
    // Split cards have image_uris at top level (rotated full card image)
    // and card_faces entries, but each face's image_uris is typically null.
    const POST = await getHandler();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{
          name: "Fire // Ice",
          image_uris: { small: "http://img/fire-ice-small", normal: "http://img/fire-ice-normal" },
          card_faces: [
            { name: "Fire", image_uris: null },
            { name: "Ice", image_uris: null },
          ],
          prices: { usd: "1.50" },
          color_identity: ["U", "R"],
          type_line: "Instant // Instant",
          id: "fire-ice-id",
          scryfall_uri: "http://scryfall/fire-ice",
        }],
      }),
    });

    const res = await POST(makeRequest({ decklist: "1 Fire // Ice" }));
    const data = await res.json();
    expect(data.cards).toHaveLength(1);
    expect(data.cards[0].found).toBe(true);
    expect(data.cards[0].name).toBe("Fire // Ice");
    expect(data.cards[0].imageSmall).toBe("http://img/fire-ice-small");
    expect(data.cards[0].imageNormal).toBe("http://img/fire-ice-normal");
    expect(data.totalPrice).toBe(1.5);
  });

  it("matches split card when decklist has only the front face name", async () => {
    // e.g. "1 Fire" in decklist should resolve to "Fire // Ice"
    // via the front-name mapping after the initial lookup.
    const POST = await getHandler();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{
          name: "Fire // Ice",
          image_uris: { small: "http://img/fire-ice", normal: "http://img/fire-ice-n" },
          prices: { usd: "1.50" },
          id: "fi",
          scryfall_uri: "http://scryfall/fi",
        }],
      }),
    });

    const res = await POST(makeRequest({ decklist: "1 Fire" }));
    const data = await res.json();
    expect(data.cards[0].found).toBe(true);
    expect(data.cards[0].imageSmall).toBe("http://img/fire-ice");
  });

  it("handles Aftermath-style split cards (Commit // Memory)", async () => {
    // Aftermath cards are a variant of split cards
    const POST = await getHandler();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{
          name: "Commit // Memory",
          image_uris: { small: "http://img/cm-small", normal: "http://img/cm-normal" },
          card_faces: [
            { name: "Commit", type_line: "Instant" },
            { name: "Memory", type_line: "Sorcery" },
          ],
          prices: { usd: "0.75" },
          color_identity: ["U"],
          id: "cm-id",
          scryfall_uri: "http://scryfall/cm",
        }],
      }),
    });

    const res = await POST(makeRequest({ decklist: "1 Commit // Memory" }));
    const data = await res.json();
    expect(data.cards[0].found).toBe(true);
    expect(data.cards[0].imageSmall).toBe("http://img/cm-small");
    expect(data.cards[0].name).toBe("Commit // Memory");
  });

  it("strips Fire // Ice set code correctly", async () => {
    // Regression test: the set-code strip regex should not accidentally
    // strip the // from split cards
    const POST = await getHandler();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{
          name: "Fire // Ice",
          image_uris: { small: "http://img/fi" },
          prices: { usd: "1.00" },
          id: "fi2",
          scryfall_uri: "http://scryfall/fi2",
        }],
      }),
    });

    const res = await POST(makeRequest({
      decklist: "1 Fire // Ice (APC) 128",
    }));
    const data = await res.json();
    expect(data.cards[0].name).toBe("Fire // Ice");
    expect(data.cards[0].found).toBe(true);
  });

  it("strips set codes from card names", async () => {
    const POST = await getHandler();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { name: "Sol Ring", prices: { usd: "2.00" }, image_uris: { small: "http://img/sol" }, id: "a1" },
          { name: "Lightning Bolt", prices: { usd: "1.00" }, image_uris: { small: "http://img/bolt" }, id: "a2" },
        ],
      }),
    });

    const res = await POST(makeRequest({
      decklist: "1 Sol Ring (C20) 225\n1 Lightning Bolt (FDN) 327",
    }));
    const data = await res.json();
    expect(data.cards[0].name).toBe("Sol Ring");
    expect(data.cards[0].found).toBe(true);
    expect(data.cards[1].name).toBe("Lightning Bolt");
    expect(data.cards[1].found).toBe(true);
    expect(data.totalPrice).toBe(3.0);

    // Verify identifiers sent to Scryfall don't include set codes
    const collectionCall = mockFetch.mock.calls.find(
      (c: unknown[]) => typeof c[0] === "string" && (c[0] as string).includes("/collection")
    );
    const reqBody = JSON.parse(((collectionCall as unknown[])[1] as { body: string }).body);
    expect(reqBody.identifiers[0].name).toBe("sol ring");
    expect(reqBody.identifiers[1].name).toBe("lightning bolt");
  });

  it("strips foil markers from card names", async () => {
    const POST = await getHandler();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ name: "Riverpyre Verge", prices: { usd: "22.42" }, image_uris: { small: "http://img/rv" }, id: "rv1" }],
      }),
    });

    const res = await POST(makeRequest({ decklist: "1 Riverpyre Verge (DFT) 503 *F*" }));
    const data = await res.json();
    expect(data.cards[0].name).toBe("Riverpyre Verge");
    expect(data.cards[0].found).toBe(true);
    expect(data.cards[0].priceUsd).toBe(22.42);
  });

  it("strips set codes in bracket format", async () => {
    const POST = await getHandler();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ name: "Sol Ring", prices: { usd: "2.00" }, image_uris: { small: "http://img" }, id: "a1" }],
      }),
    });

    const res = await POST(makeRequest({ decklist: "1 Sol Ring [C20] 225" }));
    const data = await res.json();
    expect(data.cards[0].name).toBe("Sol Ring");
    expect(data.cards[0].found).toBe(true);
  });

  it("handles Scryfall API failure", async () => {
    const POST = await getHandler();
    mockFetch.mockResolvedValue({ ok: false });

    const res = await POST(makeRequest({ decklist: "1 Sol Ring" }));
    const data = await res.json();
    expect(data.cards[0].found).toBe(false);
    expect(data.totalPrice).toBe(0);
  });

  it("skips comment lines", async () => {
    const POST = await getHandler();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ name: "Sol Ring", prices: { usd: "2.00" }, image_uris: { small: "http://img" }, id: "abc" }],
      }),
    });

    const res = await POST(makeRequest({ decklist: "// Artifacts\n# Ramp\n1 Sol Ring\n\n" }));
    const data = await res.json();
    expect(data.cards).toHaveLength(1);
    expect(data.cards[0].name).toBe("Sol Ring");
  });

  it("returns 400 for invalid JSON", async () => {
    const POST = await getHandler();
    const req = new Request("http://localhost/api/cards/collection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("retries priceless cards with search for priced printing", async () => {
    const POST = await getHandler();
    // First call: collection returns card without price
    // Second call: search returns priced printing
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ name: "Promo Card", prices: { usd: null, usd_foil: null }, image_uris: { small: "http://img" }, id: "p1" }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{
            name: "Promo Card",
            prices: { usd: "5.00", usd_foil: null },
            image_uris: { small: "http://img/latest" },
            id: "p1-latest",
          }],
        }),
      });

    const res = await POST(makeRequest({ decklist: "1 Promo Card" }));
    const data = await res.json();
    expect(data.cards[0].priceUsd).toBe(5.0);
    expect(data.totalPrice).toBe(5.0);
  });

  it("uses cached card data", async () => {
    const POST = await getHandler();
    const cachedCard = {
      name: "Sol Ring",
      prices: { usd: "2.00" },
      image_uris: { small: "http://cached/img" },
      id: "cached-id",
    };
    mockCacheFindUnique.mockResolvedValue({
      name: "sol ring",
      data: JSON.stringify(cachedCard),
      fetchedAt: new Date(), // fresh
    });

    const res = await POST(makeRequest({ decklist: "1 Sol Ring" }));
    const data = await res.json();
    expect(data.cards[0].found).toBe(true);
    expect(data.cards[0].priceUsd).toBe(2.0);
    expect(data.cards[0].imageSmall).toBe("http://cached/img");
    // Should NOT have called Scryfall
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("skips stale cache and fetches fresh", async () => {
    const POST = await getHandler();
    mockCacheFindUnique.mockResolvedValue({
      name: "sol ring",
      data: JSON.stringify({ name: "Sol Ring", prices: { usd: "1.00" } }),
      fetchedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago = stale
    });
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ name: "Sol Ring", prices: { usd: "2.50" }, image_uris: { small: "http://fresh" }, id: "new" }],
      }),
    });

    const res = await POST(makeRequest({ decklist: "1 Sol Ring" }));
    const data = await res.json();
    expect(data.cards[0].priceUsd).toBe(2.5);
    expect(mockFetch).toHaveBeenCalled();
  });
});
