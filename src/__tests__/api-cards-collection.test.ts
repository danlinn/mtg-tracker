import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

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
    const fetchCall = mockFetch.mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    expect(body.identifiers[0].name).toBe("Sol Ring");
    expect(body.identifiers[1].name).toBe("Lightning Bolt");
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
});
