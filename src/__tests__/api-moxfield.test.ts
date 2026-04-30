import { describe, it, expect, jest, beforeEach } from "@jest/globals";

jest.mock("@/lib/auth-helpers", () => ({
  getCurrentUserId: jest.fn(),
}));

jest.mock("@/lib/moxfield", () => ({
  fetchMoxfieldDeck: jest.fn(),
  extractDecklistFromMoxfield: jest.fn(),
  extractColorsFromMoxfield: jest.fn(),
}));

import { POST } from "@/app/api/moxfield/route";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { fetchMoxfieldDeck, extractDecklistFromMoxfield, extractColorsFromMoxfield } from "@/lib/moxfield";

const mockGetUserId = getCurrentUserId as jest.MockedFunction<typeof getCurrentUserId>;
const mockFetchDeck = fetchMoxfieldDeck as jest.MockedFunction<typeof fetchMoxfieldDeck>;
const mockExtractDecklist = extractDecklistFromMoxfield as jest.MockedFunction<typeof extractDecklistFromMoxfield>;
const mockExtractColors = extractColorsFromMoxfield as jest.MockedFunction<typeof extractColorsFromMoxfield>;

beforeEach(() => jest.clearAllMocks());

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/moxfield", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/moxfield", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetUserId.mockResolvedValue(null);
    const res = await POST(makeRequest({ url: "https://moxfield.com/decks/abc123" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when url is missing", async () => {
    mockGetUserId.mockResolvedValue("user-1");
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid URL", async () => {
    mockGetUserId.mockResolvedValue("user-1");
    const res = await POST(makeRequest({ url: "not a valid url at all !!!" }));
    expect(res.status).toBe(400);
  });

  it("parses moxfield.com URL and returns deck data", async () => {
    mockGetUserId.mockResolvedValue("user-1");
    mockFetchDeck.mockResolvedValue({
      id: "abc123",
      name: "Test Deck",
      publicUrl: "https://moxfield.com/decks/abc123",
      commanders: {
        "Sol": { quantity: 1, card: { name: "Sol Ring", scryfall_id: "", type_line: "", mana_cost: "", colors: [], color_identity: [] } },
      },
      companions: {},
      mainboard: {},
    } as never);
    mockExtractDecklist.mockReturnValue("1 Sol Ring");
    mockExtractColors.mockReturnValue({ W: false, U: false, B: false, R: false, G: false });

    const res = await POST(makeRequest({ url: "https://moxfield.com/decks/abc123" }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.name).toBe("Test Deck");
    expect(data.decklist).toBe("1 Sol Ring");
    expect(data.moxfieldId).toBe("abc123");
  });

  it("accepts bare deck ID", async () => {
    mockGetUserId.mockResolvedValue("user-1");
    mockFetchDeck.mockResolvedValue({
      id: "xyz789",
      name: "Bare ID Deck",
      publicUrl: "",
      commanders: {},
      companions: {},
      mainboard: {},
    } as never);
    mockExtractDecklist.mockReturnValue("");
    mockExtractColors.mockReturnValue({ W: false, U: false, B: false, R: false, G: false });

    const res = await POST(makeRequest({ url: "xyz789" }));
    expect(res.status).toBe(200);
    expect(mockFetchDeck).toHaveBeenCalledWith("xyz789");
  });

  it("handles invalid JSON body", async () => {
    mockGetUserId.mockResolvedValue("user-1");
    const res = await POST(new Request("http://localhost/api/moxfield", {
      method: "POST",
      body: "not json",
    }));
    expect(res.status).toBe(400);
  });

  it("returns 502 when Moxfield API fails", async () => {
    mockGetUserId.mockResolvedValue("user-1");
    mockFetchDeck.mockRejectedValue(new Error("Moxfield API error 404: "));

    const res = await POST(makeRequest({ url: "abc123" }));
    expect(res.status).toBe(502);
  });
});
