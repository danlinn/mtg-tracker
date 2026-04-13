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

  it("handles split cards like Fire // Ice (image_uris at top level)", async () => {
    // Split cards have image_uris at the top level (single sideways image)
    // plus card_faces entries, but each face's image_uris may be null.
    const GET = await getHandler();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        name: "Fire // Ice",
        image_uris: {
          art_crop: "http://img/fire-ice-art",
          normal: "http://img/fire-ice-normal",
          small: "http://img/fire-ice-small",
        },
        card_faces: [
          { name: "Fire", image_uris: null },
          { name: "Ice", image_uris: null },
        ],
        color_identity: ["U", "R"],
        type_line: "Instant // Instant",
      }),
    });

    const res = await GET(makeRequest("name=Fire%20%2F%2F%20Ice"));
    const data = await res.json();
    expect(data.card.name).toBe("Fire // Ice");
    expect(data.card.image).toBe("http://img/fire-ice-art");
    expect(data.card.colors).toEqual(["U", "R"]);
  });

  it("URL-encodes double slashes in split card names", async () => {
    const GET = await getHandler();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        name: "Fire // Ice",
        image_uris: { art_crop: "http://img/x", small: "http://img/s" },
        color_identity: [],
        type_line: "",
      }),
    });

    await GET(makeRequest("name=Fire%20%2F%2F%20Ice"));
    // Verify the fetch URL had the slashes properly encoded
    const callUrl = mockFetch.mock.calls[0][0] as string;
    expect(callUrl).toContain("fuzzy=");
    // encodeURIComponent should have produced %2F for /
    expect(callUrl).toContain("%2F%2F");
  });

  it("falls back to card_faces image when top-level image_uris is null on split card", async () => {
    // Edge case: some split-like cards have image_uris null at top level
    const GET = await getHandler();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        name: "Assault // Battery",
        image_uris: null,
        card_faces: [
          {
            name: "Assault",
            image_uris: { art_crop: "http://img/assault-art", small: "http://img/s" },
          },
          { name: "Battery", image_uris: null },
        ],
        color_identity: ["R", "G"],
        type_line: "Instant // Instant",
      }),
    });

    const res = await GET(makeRequest("name=Assault"));
    const data = await res.json();
    expect(data.card.image).toBe("http://img/assault-art");
  });
});
