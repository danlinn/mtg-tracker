import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockGetCurrentUserId = jest.fn();
jest.mock("@/lib/auth-helpers", () => ({
  getCurrentUserId: () => mockGetCurrentUserId(),
}));

jest.mock("@/lib/playgroup", () => ({
  buildGamePlayerWhere: () => Promise.resolve({}),
}));

const mockUserFindUnique = jest.fn();
const mockGamePlayerCount = jest.fn();
const mockDeckFindMany = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
    gamePlayer: {
      count: (...args: unknown[]) => mockGamePlayerCount(...args),
    },
    deck: {
      findMany: (...args: unknown[]) => mockDeckFindMany(...args),
    },
  },
}));

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

async function getHandler() {
  const mod = await import("@/app/api/players/[id]/route");
  return mod.GET;
}

describe("GET /api/players/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    const GET = await getHandler();
    mockGetCurrentUserId.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost"), makeParams("u1"));
    expect(res.status).toBe(401);
  });

  it("returns 404 when player not found", async () => {
    const GET = await getHandler();
    mockGetCurrentUserId.mockResolvedValue("me");
    mockUserFindUnique.mockResolvedValue(null);

    const res = await GET(new Request("http://localhost"), makeParams("nonexistent"));
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Player not found");
  });

  it("returns player profile with stats", async () => {
    const GET = await getHandler();
    mockGetCurrentUserId.mockResolvedValue("me");
    mockUserFindUnique.mockResolvedValue({ id: "u1", name: "Alice" });
    mockGamePlayerCount
      .mockResolvedValueOnce(4)  // totalGames
      .mockResolvedValueOnce(2); // wins
    mockDeckFindMany.mockResolvedValue([
      {
        id: "d1", name: "Deck 1", commander: "C1", commander2: null,
        commanderImage: null, commander2Image: null,
        colorW: true, colorU: false, colorB: false, colorR: false, colorG: false,
        bracket: 3, edhp: 5.5, lastPlayedAt: new Date("2025-01-01"),
        gameEntries: [
          { isWinner: true, game: { players: [{ id: "1" }, { id: "2" }] } },
          { isWinner: false, game: { players: [{ id: "1" }, { id: "2" }] } },
        ],
      },
    ]);

    const res = await GET(new Request("http://localhost"), makeParams("u1"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe("Alice");
    expect(data.totalGames).toBe(4);
    expect(data.wins).toBe(2);
    expect(data.losses).toBe(2);
    expect(data.winRate).toBe(50);
    expect(data.deckStats).toHaveLength(1);
    expect(data.deckStats[0].name).toBe("Deck 1");
    expect(data.deckStats[0].games).toBe(2);
    expect(data.deckStats[0].wins).toBe(1);
  });

  it("returns empty deckStats for player with no decks", async () => {
    const GET = await getHandler();
    mockGetCurrentUserId.mockResolvedValue("me");
    mockUserFindUnique.mockResolvedValue({ id: "u2", name: "Bob" });
    mockGamePlayerCount.mockResolvedValue(0);
    mockDeckFindMany.mockResolvedValue([]);

    const res = await GET(new Request("http://localhost"), makeParams("u2"));
    const data = await res.json();
    expect(data.deckStats).toEqual([]);
    expect(data.totalGames).toBe(0);
    expect(data.winRate).toBe(0);
  });

  it("winRate is 0 when wins is 0 (no division by zero)", async () => {
    const GET = await getHandler();
    mockGetCurrentUserId.mockResolvedValue("me");
    mockUserFindUnique.mockResolvedValue({ id: "u3", name: "Charlie" });
    mockGamePlayerCount
      .mockResolvedValueOnce(5)  // totalGames
      .mockResolvedValueOnce(0); // wins
    mockDeckFindMany.mockResolvedValue([]);

    const res = await GET(new Request("http://localhost"), makeParams("u3"));
    const data = await res.json();
    expect(data.totalGames).toBe(5);
    expect(data.wins).toBe(0);
    expect(data.losses).toBe(5);
    expect(data.winRate).toBe(0);
  });

  it("winRate is 100 when all games are wins", async () => {
    const GET = await getHandler();
    mockGetCurrentUserId.mockResolvedValue("me");
    mockUserFindUnique.mockResolvedValue({ id: "u4", name: "Diana" });
    mockGamePlayerCount
      .mockResolvedValueOnce(3)  // totalGames
      .mockResolvedValueOnce(3); // wins
    mockDeckFindMany.mockResolvedValue([]);

    const res = await GET(new Request("http://localhost"), makeParams("u4"));
    const data = await res.json();
    expect(data.winRate).toBe(100);
    expect(data.losses).toBe(0);
  });
});
