import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

async function getHandler() {
  const mod = await import("@/app/api/cards/rulings/route");
  return mod.GET;
}

describe("GET /api/cards/rulings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 without id parameter", async () => {
    const GET = await getHandler();
    const res = await GET(new Request("http://localhost/api/cards/rulings"));
    expect(res.status).toBe(400);
  });

  it("returns rulings for a card", async () => {
    const GET = await getHandler();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { source: "wotc", published_at: "2024-01-01", comment: "This card is great." },
          { source: "scryfall", published_at: "2024-02-01", comment: "Note about interaction." },
        ],
      }),
    });

    const res = await GET(new Request("http://localhost/api/cards/rulings?id=abc123"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.rulings).toHaveLength(2);
    expect(data.rulings[0].source).toBe("wotc");
    expect(data.rulings[0].comment).toBe("This card is great.");
  });

  it("returns empty array on API failure", async () => {
    const GET = await getHandler();
    mockFetch.mockResolvedValue({ ok: false });

    const res = await GET(new Request("http://localhost/api/cards/rulings?id=bad"));
    const data = await res.json();
    expect(data.rulings).toEqual([]);
  });

  it("returns empty array on network error", async () => {
    const GET = await getHandler();
    mockFetch.mockRejectedValue(new Error("Network error"));

    const res = await GET(new Request("http://localhost/api/cards/rulings?id=abc"));
    const data = await res.json();
    expect(data.rulings).toEqual([]);
  });
});
