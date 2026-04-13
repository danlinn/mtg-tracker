import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockGetCurrentUserId = jest.fn();
jest.mock("@/lib/auth-helpers", () => ({
  getCurrentUserId: () => mockGetCurrentUserId(),
}));

jest.mock("@/lib/playgroup", () => ({
  buildGamePlayerWhere: () => Promise.resolve({}),
}));

const mockGamePlayerCount = jest.fn();
const mockDeckFindMany = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    gamePlayer: {
      count: (...args: unknown[]) => mockGamePlayerCount(...args),
    },
    deck: {
      findMany: (...args: unknown[]) => mockDeckFindMany(...args),
    },
  },
}));

async function getHandler() {
  const mod = await import("@/app/api/stats/route");
  return mod.GET;
}

describe("GET /api/stats", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    const GET = await getHandler();
    mockGetCurrentUserId.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns zero stats when no games played", async () => {
    const GET = await getHandler();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockGamePlayerCount.mockResolvedValue(0);
    mockDeckFindMany.mockResolvedValue([]);

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.totalGames).toBe(0);
    expect(data.wins).toBe(0);
    expect(data.losses).toBe(0);
    expect(data.winRate).toBe(0);
    expect(data.deckStats).toEqual([]);
  });

  it("calculates correct stats with games", async () => {
    const GET = await getHandler();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockGamePlayerCount
      .mockResolvedValueOnce(5) // totalGames
      .mockResolvedValueOnce(3); // wins
    mockDeckFindMany.mockResolvedValue([
      {
        id: "d1",
        name: "Deck 1",
        commander: "Commander 1",
        commander2: null,
        lastPlayedAt: new Date("2025-01-01"),
        gameEntries: [
          { isWinner: true, game: { players: [{ id: "1" }, { id: "2" }] } },
          { isWinner: false, game: { players: [{ id: "1" }, { id: "2" }, { id: "3" }] } },
          { isWinner: true, game: { players: [{ id: "1" }, { id: "2" }] } },
        ],
      },
    ]);

    const res = await GET();
    const data = await res.json();
    expect(data.totalGames).toBe(5);
    expect(data.wins).toBe(3);
    expect(data.losses).toBe(2);
    expect(data.winRate).toBe(60);
    expect(data.deckStats).toHaveLength(1);
    expect(data.deckStats[0].games).toBe(3);
    expect(data.deckStats[0].wins).toBe(2);
    expect(data.deckStats[0].winRate).toBe(67);
    expect(data.deckStats[0].winRateByPlayerCount[2]).toEqual({
      games: 2, wins: 2, winRate: 100,
    });
    expect(data.deckStats[0].winRateByPlayerCount[3]).toEqual({
      games: 1, wins: 0, winRate: 0,
    });
  });

  it("sorts decks by lastPlayedAt descending, null last", async () => {
    const GET = await getHandler();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockGamePlayerCount.mockResolvedValue(0);
    mockDeckFindMany.mockResolvedValue([
      { id: "d1", name: "Old", commander: "C1", commander2: null, lastPlayedAt: new Date("2024-01-01"), gameEntries: [] },
      { id: "d2", name: "Never", commander: "C2", commander2: null, lastPlayedAt: null, gameEntries: [] },
      { id: "d3", name: "Recent", commander: "C3", commander2: null, lastPlayedAt: new Date("2025-06-01"), gameEntries: [] },
    ]);

    const res = await GET();
    const data = await res.json();
    expect(data.deckStats[0].name).toBe("Recent");
    expect(data.deckStats[1].name).toBe("Old");
    expect(data.deckStats[2].name).toBe("Never");
  });
});
