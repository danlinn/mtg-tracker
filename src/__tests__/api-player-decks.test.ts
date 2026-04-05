import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockGetCurrentUserId = jest.fn();
jest.mock("@/lib/auth-helpers", () => ({
  getCurrentUserId: () => mockGetCurrentUserId(),
}));

const mockDeckFindUnique = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    deck: {
      findUnique: (...args: unknown[]) => mockDeckFindUnique(...args),
    },
  },
}));

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

async function getHandler() {
  const mod = await import("@/app/api/players/decks/[id]/route");
  return mod.GET;
}

describe("GET /api/players/decks/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    const GET = await getHandler();
    mockGetCurrentUserId.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost"), makeParams("d1"));
    expect(res.status).toBe(401);
  });

  it("returns 404 when deck not found", async () => {
    const GET = await getHandler();
    mockGetCurrentUserId.mockResolvedValue("me");
    mockDeckFindUnique.mockResolvedValue(null);

    const res = await GET(new Request("http://localhost"), makeParams("nonexistent"));
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Deck not found");
  });

  it("returns deck with stats and decklist", async () => {
    const GET = await getHandler();
    mockGetCurrentUserId.mockResolvedValue("me");
    mockDeckFindUnique.mockResolvedValue({
      id: "d1",
      name: "Krenko Goblins",
      commander: "Krenko, Mob Boss",
      commander2: null,
      commanderImage: "http://img/krenko",
      commander2Image: null,
      colorW: false, colorU: false, colorB: false, colorR: true, colorG: false,
      bracket: 3,
      edhp: 5.5,
      decklist: "1 Sol Ring\n1 Lightning Bolt",
      user: { id: "u1", name: "Alice" },
      gameEntries: [
        { isWinner: true, game: { players: [{ id: "1" }, { id: "2" }] } },
        { isWinner: false, game: { players: [{ id: "1" }, { id: "2" }, { id: "3" }] } },
        { isWinner: true, game: { players: [{ id: "1" }, { id: "2" }] } },
      ],
    });

    const res = await GET(new Request("http://localhost"), makeParams("d1"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe("Krenko Goblins");
    expect(data.decklist).toBe("1 Sol Ring\n1 Lightning Bolt");
    expect(data.owner.name).toBe("Alice");
    expect(data.games).toBe(3);
    expect(data.wins).toBe(2);
    expect(data.winRate).toBe(67);
    expect(data.winRateByPlayerCount[2]).toEqual({ games: 2, wins: 2, winRate: 100 });
    expect(data.winRateByPlayerCount[3]).toEqual({ games: 1, wins: 0, winRate: 0 });
    expect(data.colorR).toBe(true);
    expect(data.bracket).toBe(3);
  });

  it("returns null decklist when deck has none", async () => {
    const GET = await getHandler();
    mockGetCurrentUserId.mockResolvedValue("me");
    mockDeckFindUnique.mockResolvedValue({
      id: "d2",
      name: "Empty Deck",
      commander: "C1",
      commander2: null,
      commanderImage: null,
      commander2Image: null,
      colorW: true, colorU: false, colorB: false, colorR: false, colorG: false,
      bracket: null,
      edhp: null,
      decklist: null,
      user: { id: "u1", name: "Bob" },
      gameEntries: [],
    });

    const res = await GET(new Request("http://localhost"), makeParams("d2"));
    const data = await res.json();
    expect(data.decklist).toBeNull();
    expect(data.games).toBe(0);
    expect(data.winRate).toBe(0);
  });

  it("returns deck with partner commander", async () => {
    const GET = await getHandler();
    mockGetCurrentUserId.mockResolvedValue("me");
    mockDeckFindUnique.mockResolvedValue({
      id: "d3",
      name: "Partners",
      commander: "Tymna",
      commander2: "Thrasios",
      commanderImage: "http://img/tymna",
      commander2Image: "http://img/thrasios",
      colorW: true, colorU: true, colorB: true, colorR: false, colorG: true,
      bracket: 4,
      edhp: 8.0,
      decklist: "1 Sol Ring",
      user: { id: "u1", name: "Alice" },
      gameEntries: [],
    });

    const res = await GET(new Request("http://localhost"), makeParams("d3"));
    const data = await res.json();
    expect(data.commander2).toBe("Thrasios");
    expect(data.commander2Image).toBe("http://img/thrasios");
  });
});
