import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

async function getHandler() {
  const mod = await import("@/app/api/cards/route");
  return mod.GET;
}

function makeRequest(params: string) {
  return new Request(`http://localhost/api/cards?${params}`);
}

describe("GET /api/cards", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 with no parameters", async () => {
    const GET = await getHandler();
    const res = await GET(makeRequest(""));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Provide");
  });

  it("returns autocomplete results for ?q=", async () => {
    const GET = await getHandler();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: ["Krenko, Mob Boss", "Krenko, Tin Street Kingpin"] }),
    });

    const res = await GET(makeRequest("q=kren"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data).toEqual(["Krenko, Mob Boss", "Krenko, Tin Street Kingpin"]);
  });

  it("returns empty array when autocomplete fails", async () => {
    const GET = await getHandler();
    mockFetch.mockResolvedValue({ ok: false });

    const res = await GET(makeRequest("q=zzzzz"));
    const data = await res.json();
    expect(data.data).toEqual([]);
  });

  it("returns card data for ?name=", async () => {
    const GET = await getHandler();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        name: "Krenko, Mob Boss",
        image_uris: { art_crop: "http://img/art", normal: "http://img/normal", small: "http://img/small" },
        color_identity: ["R"],
        type_line: "Legendary Creature",
      }),
    });

    const res = await GET(makeRequest("name=Krenko, Mob Boss"));
    const data = await res.json();
    expect(data.card.name).toBe("Krenko, Mob Boss");
    expect(data.card.image).toBe("http://img/art");
    expect(data.card.colors).toEqual(["R"]);
  });

  it("handles double-faced cards with card_faces", async () => {
    const GET = await getHandler();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        name: "Delver of Secrets // Insectile Aberration",
        card_faces: [
          { image_uris: { art_crop: "http://img/front", small: "http://img/front-small" } },
          { image_uris: { art_crop: "http://img/back" } },
        ],
        color_identity: ["U"],
        type_line: "Creature",
      }),
    });

    const res = await GET(makeRequest("name=Delver"));
    const data = await res.json();
    expect(data.card.image).toBe("http://img/front");
  });

  it("returns null card when name lookup fails", async () => {
    const GET = await getHandler();
    mockFetch.mockResolvedValue({ ok: false });

    const res = await GET(makeRequest("name=NonexistentCard"));
    const data = await res.json();
    expect(data.card).toBeNull();
  });
});
