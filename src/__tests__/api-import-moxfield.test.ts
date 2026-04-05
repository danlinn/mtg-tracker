import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockGetCurrentUserId = jest.fn();
jest.mock("@/lib/auth-helpers", () => ({
  getCurrentUserId: () => mockGetCurrentUserId(),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

async function getHandler() {
  const mod = await import("@/app/api/import/moxfield/route");
  return mod.POST;
}

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/import/moxfield", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/import/moxfield", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    const POST = await getHandler();
    mockGetCurrentUserId.mockResolvedValue(null);
    const res = await POST(makeRequest({ url: "https://www.moxfield.com/decks/abc" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 without url", async () => {
    const POST = await getHandler();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("url is required");
  });

  it("returns 400 for invalid Moxfield URL", async () => {
    const POST = await getHandler();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    const res = await POST(makeRequest({ url: "https://google.com/not-moxfield" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid Moxfield URL");
  });

  it("imports a Moxfield deck successfully", async () => {
    const POST = await getHandler();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        name: "Krenko Goblins",
        boards: {
          commanders: {
            cards: {
              "card1": {
                quantity: 1,
                card: { name: "Krenko, Mob Boss", color_identity: ["R"] },
              },
            },
          },
          mainboard: {
            cards: {
              "card2": { quantity: 1, card: { name: "Sol Ring" } },
              "card3": { quantity: 4, card: { name: "Lightning Bolt" } },
              "card4": { quantity: 1, card: { name: "Mountain" } },
            },
          },
        },
      }),
    });

    const res = await POST(makeRequest({ url: "https://www.moxfield.com/decks/abc123" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe("Krenko Goblins");
    expect(data.commanders).toEqual(["Krenko, Mob Boss"]);
    expect(data.colorIdentity).toEqual(["R"]);
    expect(data.decklist).toContain("1 Sol Ring");
    expect(data.decklist).toContain("4 Lightning Bolt");
    expect(data.cardCount).toBe(6);
    expect(data.moxfieldUrl).toBe("https://www.moxfield.com/decks/abc123");
  });

  it("handles partner commanders", async () => {
    const POST = await getHandler();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        name: "Partners",
        boards: {
          commanders: {
            cards: {
              "c1": { quantity: 1, card: { name: "Tymna the Weaver", color_identity: ["W", "B"] } },
              "c2": { quantity: 1, card: { name: "Thrasios, Triton Hero", color_identity: ["U", "G"] } },
            },
          },
          mainboard: { cards: {} },
        },
      }),
    });

    const res = await POST(makeRequest({ url: "https://www.moxfield.com/decks/xyz" }));
    const data = await res.json();
    expect(data.commanders).toHaveLength(2);
    expect(data.colorIdentity).toContain("W");
    expect(data.colorIdentity).toContain("B");
    expect(data.colorIdentity).toContain("U");
    expect(data.colorIdentity).toContain("G");
  });

  it("returns 404 when Moxfield deck not found", async () => {
    const POST = await getHandler();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockFetch.mockResolvedValue({ ok: false, status: 404 });

    const res = await POST(makeRequest({ url: "https://www.moxfield.com/decks/nonexistent" }));
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toContain("Moxfield");
  });

  it("returns 500 on network error", async () => {
    const POST = await getHandler();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockFetch.mockRejectedValue(new Error("Network error"));

    const res = await POST(makeRequest({ url: "https://www.moxfield.com/decks/abc" }));
    expect(res.status).toBe(500);
  });

  it("extracts deck ID from bare ID string", async () => {
    const POST = await getHandler();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        name: "Test",
        boards: { commanders: { cards: {} }, mainboard: { cards: {} } },
      }),
    });

    const res = await POST(makeRequest({ url: "abc123-def" }));
    expect(res.status).toBe(200);
    // Verify it called Moxfield with the bare ID
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("abc123-def"),
      expect.any(Object)
    );
  });

  it("returns 400 for invalid JSON body", async () => {
    const POST = await getHandler();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    const req = new Request("http://localhost/api/import/moxfield", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
