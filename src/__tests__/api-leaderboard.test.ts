import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockGetCurrentUserId = jest.fn();
jest.mock("@/lib/auth-helpers", () => ({
  getCurrentUserId: () => mockGetCurrentUserId(),
}));

const mockGetActivePlaygroupId = jest.fn();
const mockGetPlaygroupIdsForUser = jest.fn();
jest.mock("@/lib/playgroup", () => ({
  getActivePlaygroupId: () => mockGetActivePlaygroupId(),
  getPlaygroupIdsForUser: () => mockGetPlaygroupIdsForUser(),
}));

const mockGamePlayerFindMany = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    gamePlayer: {
      findMany: (...args: unknown[]) => mockGamePlayerFindMany(...args),
    },
  },
}));

async function getHandler() {
  const mod = await import("@/app/api/leaderboard/route");
  return mod.GET;
}

function makeRequest(params = "") {
  return new Request(`http://localhost/api/leaderboard${params ? `?${params}` : ""}`);
}

// Helper: create a gamePlayer entry
function gpEntry(userId: string, userName: string, isWinner: boolean, playerCount = 2, winBracket: number | null = null, loserBracket: number | null = null) {
  const players = [
    { id: `p-${Math.random()}`, isWinner: true, deck: { bracket: winBracket, edhp: null } },
  ];
  for (let i = 1; i < playerCount; i++) {
    players.push({ id: `p-${Math.random()}`, isWinner: false, deck: { bracket: loserBracket, edhp: null } });
  }
  return {
    isWinner,
    userId,
    user: { id: userId, name: userName },
    game: { players },
  };
}

describe("GET /api/leaderboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetActivePlaygroupId.mockResolvedValue(null);
    mockGetPlaygroupIdsForUser.mockResolvedValue(["pg1"]);
  });

  it("returns 401 when not authenticated", async () => {
    const GET = await getHandler();
    mockGetCurrentUserId.mockResolvedValue(null);
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns empty entries when no games", async () => {
    const GET = await getHandler();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockGamePlayerFindMany.mockResolvedValue([]);

    const res = await GET(makeRequest());
    const data = await res.json();
    expect(data.entries).toEqual([]);
    expect(data.total).toBe(0);
  });

  it("sorts by winRate descending, then wins as tiebreaker", async () => {
    const GET = await getHandler();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockGamePlayerFindMany.mockResolvedValue([
      gpEntry("u1", "Alice", true),
      gpEntry("u1", "Alice", false),
      gpEntry("u1", "Alice", false),  // Alice: 1/3 = 33%
      gpEntry("u2", "Bob", true),
      gpEntry("u2", "Bob", true),
      gpEntry("u2", "Bob", false),    // Bob: 2/3 = 67%
    ]);

    const res = await GET(makeRequest());
    const data = await res.json();
    expect(data.entries).toHaveLength(2);
    expect(data.entries[0].name).toBe("Bob");
    expect(data.entries[0].winRate).toBe(67);
    expect(data.entries[1].name).toBe("Alice");
  });

  it("calculates winRate correctly", async () => {
    const GET = await getHandler();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockGamePlayerFindMany.mockResolvedValue([
      gpEntry("u1", "Alice", true),
      gpEntry("u1", "Alice", true),
      gpEntry("u1", "Alice", false),
    ]);

    const res = await GET(makeRequest());
    const data = await res.json();
    expect(data.entries[0].winRate).toBe(67);
    expect(data.entries[0].games).toBe(3);
    expect(data.entries[0].wins).toBe(2);
  });

  it("paginates results", async () => {
    const GET = await getHandler();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockGamePlayerFindMany.mockResolvedValue([
      gpEntry("u1", "Alice", true),
    ]);

    const res = await GET(makeRequest("page=1&perPage=20"));
    const data = await res.json();
    expect(data.page).toBe(1);
    expect(data.perPage).toBe(20);
    expect(data.totalPages).toBe(1);
  });

  it("counts win labels correctly", async () => {
    const GET = await getHandler();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockGamePlayerFindMany.mockResolvedValue([
      gpEntry("u1", "Alice", true, 2, 3, 4),   // Nice win
      gpEntry("u1", "Alice", true, 2, 1, 4),   // Big win
      gpEntry("u1", "Alice", true, 2, 4, 2),   // Easy win
      gpEntry("u1", "Alice", true, 2, 3, 3),   // Normal win
      gpEntry("u1", "Alice", false, 2),
    ]);

    const res = await GET(makeRequest());
    const data = await res.json();
    expect(data.entries[0].niceWins).toBe(1);
    expect(data.entries[0].bigWins).toBe(1);
    expect(data.entries[0].easyWins).toBe(1);
  });

  it("calculates winRateByPlayerCount", async () => {
    const GET = await getHandler();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockGamePlayerFindMany.mockResolvedValue([
      gpEntry("u1", "Alice", true, 2),
      gpEntry("u1", "Alice", false, 2),
      gpEntry("u1", "Alice", true, 3),
      gpEntry("u1", "Alice", false, 3),
      gpEntry("u1", "Alice", false, 3),
      gpEntry("u1", "Alice", true, 4),
    ]);

    const res = await GET(makeRequest());
    const data = await res.json();
    const pc = data.entries[0].winRateByPlayerCount;
    expect(pc[2]).toEqual({ games: 2, wins: 1, winRate: 50 });
    expect(pc[3]).toEqual({ games: 3, wins: 1, winRate: 33 });
    expect(pc[4]).toEqual({ games: 1, wins: 1, winRate: 100 });
  });

  it("specific playgroup filters at DB level", async () => {
    const GET = await getHandler();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockGetActivePlaygroupId.mockResolvedValue("pg-mtg4");
    mockGamePlayerFindMany.mockResolvedValue([
      gpEntry("u1", "Alice", true),
    ]);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    // Verify DB query filtered by playgroupId
    expect(mockGamePlayerFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { game: { playgroupId: "pg-mtg4" } },
      })
    );
  });

  it("All Groups filters by user's playgroup IDs at DB level", async () => {
    const GET = await getHandler();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockGetActivePlaygroupId.mockResolvedValue(null);
    mockGetPlaygroupIdsForUser.mockResolvedValue(["pg1", "pg2"]);
    mockGamePlayerFindMany.mockResolvedValue([]);

    await GET(makeRequest());
    // Verify DB query uses OR with user's groups + null
    const callArgs = mockGamePlayerFindMany.mock.calls[0][0] as { where: { game: unknown } };
    expect(callArgs.where.game).toEqual({
      OR: [
        { playgroupId: { in: ["pg1", "pg2"] } },
        { playgroupId: null },
      ],
    });
  });
});
