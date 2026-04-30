import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  extractDecklistFromMoxfield,
  extractColorsFromMoxfield,
  moxfieldFetch,
  fetchMoxfieldDeck,
  type MoxfieldDeck,
  type MoxfieldCard,
} from "@/lib/moxfield";

function card(name: string, colors: string[] = []): MoxfieldCard {
  return {
    quantity: 1,
    card: {
      name,
      scryfall_id: "test",
      type_line: "Creature",
      mana_cost: "",
      colors,
      color_identity: colors,
    },
  };
}

const mockDeck: MoxfieldDeck = {
  id: "test-deck",
  name: "Test Deck",
  publicUrl: "https://moxfield.com/decks/test-deck",
  commanders: {
    "Atraxa": card("Atraxa, Praetors' Voice", ["W", "U", "B", "G"]),
  },
  companions: {},
  mainboard: {
    "Sol Ring": card("Sol Ring"),
    "Command Tower": card("Command Tower"),
    "Arcane Signet": card("Arcane Signet"),
  },
};

describe("moxfieldFetch", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, MOXFIELD_USER_AGENT: "test-agent" };
    jest.spyOn(global, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it("throws when MOXFIELD_USER_AGENT is not set", async () => {
    delete process.env.MOXFIELD_USER_AGENT;
    await expect(moxfieldFetch("/test")).rejects.toThrow("MOXFIELD_USER_AGENT is not set");
  });

  it("sets User-Agent header from env", async () => {
    await moxfieldFetch("/test");
    const call = (global.fetch as jest.Mock).mock.calls[0];
    const headers = call[1].headers;
    expect(headers.get("User-Agent")).toBe("test-agent");
  });
});

describe("fetchMoxfieldDeck", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, MOXFIELD_USER_AGENT: "test-agent" };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it("throws on non-ok response", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue(new Response("Not found", { status: 404 }));
    await expect(fetchMoxfieldDeck("bad-id")).rejects.toThrow("Moxfield API error 404");
  });

  it("returns parsed deck on success", async () => {
    const mockDeck = { id: "abc", name: "Test", commanders: {}, companions: {}, mainboard: {} };
    jest.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify(mockDeck), { status: 200 }));
    const deck = await fetchMoxfieldDeck("abc");
    expect(deck.id).toBe("abc");
  });
});

describe("extractDecklistFromMoxfield", () => {
  it("formats commanders first, then mainboard", () => {
    const result = extractDecklistFromMoxfield(mockDeck);
    const lines = result.split("\n").filter(Boolean);
    expect(lines[0]).toBe("1 Atraxa, Praetors' Voice");
    expect(lines).toContain("1 Sol Ring");
    expect(lines).toContain("1 Command Tower");
  });

  it("includes companion section when present", () => {
    const deckWithCompanion: MoxfieldDeck = {
      ...mockDeck,
      companions: {
        "Lurrus": card("Lurrus of the Dream-Den", ["W", "B"]),
      },
    };
    const result = extractDecklistFromMoxfield(deckWithCompanion);
    expect(result).toContain("// Companion");
    expect(result).toContain("1 Lurrus of the Dream-Den");
  });

  it("handles empty mainboard", () => {
    const emptyDeck: MoxfieldDeck = {
      ...mockDeck,
      mainboard: {},
    };
    const result = extractDecklistFromMoxfield(emptyDeck);
    expect(result).toContain("Atraxa");
    expect(result.split("\n").filter(Boolean).length).toBe(1);
  });
});

describe("extractColorsFromMoxfield", () => {
  it("extracts color identity from commanders", () => {
    const colors = extractColorsFromMoxfield(mockDeck);
    expect(colors.W).toBe(true);
    expect(colors.U).toBe(true);
    expect(colors.B).toBe(true);
    expect(colors.R).toBe(false);
    expect(colors.G).toBe(true);
  });

  it("includes companion colors", () => {
    const deckWithCompanion: MoxfieldDeck = {
      ...mockDeck,
      commanders: { "Tymna": card("Tymna the Weaver", ["W", "B"]) },
      companions: { "Lurrus": card("Lurrus of the Dream-Den", ["W", "B"]) },
    };
    const colors = extractColorsFromMoxfield(deckWithCompanion);
    expect(colors.W).toBe(true);
    expect(colors.B).toBe(true);
    expect(colors.U).toBe(false);
  });

  it("returns all false for colorless commanders", () => {
    const colorlessDeck: MoxfieldDeck = {
      ...mockDeck,
      commanders: { "Kozilek": card("Kozilek, the Great Distortion", []) },
    };
    const colors = extractColorsFromMoxfield(colorlessDeck);
    expect(Object.values(colors).every((v) => v === false)).toBe(true);
  });

  it("handles partner commanders", () => {
    const partnerDeck: MoxfieldDeck = {
      ...mockDeck,
      commanders: {
        "Tymna": card("Tymna the Weaver", ["W", "B"]),
        "Thrasios": card("Thrasios, Triton Hero", ["G", "U"]),
      },
    };
    const colors = extractColorsFromMoxfield(partnerDeck);
    expect(colors.W).toBe(true);
    expect(colors.U).toBe(true);
    expect(colors.B).toBe(true);
    expect(colors.R).toBe(false);
    expect(colors.G).toBe(true);
  });
});
