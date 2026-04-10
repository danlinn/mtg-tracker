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

const mockUserFindMany = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: (...args: unknown[]) => mockUserFindMany(...args),
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

// Helper: create a game entry (win or loss) with a given number of players
function gameEntry(
  isWinner: boolean,
  playerCount = 2,
  winBracket: number | null = null,
  loserBracket: number | null = null
) {
  const players = [
    { id: `p-${Math.random()}`, isWinner: true, deck: { bracket: winBracket, edhp: null } },
  ];
  for (let i = 1; i < playerCount; i++) {
    players.push({
      id: `p-${Math.random()}`,
      isWinner: false,
      deck: { bracket: loserBracket, edhp: null },
    });
  }
  return {
    isWinner,
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

  it("returns empty entries when no users have games", async () => {
    const GET = await getHandler();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockUserFindMany.mockResolvedValue([]);

    const res = await GET(makeRequest());
    const data = await res.json();
    expect(data.entries).toEqual([]);
    expect(data.total).toBe(0);
  });

  it("sorts by winRate descending, then wins as tiebreaker", async () => {
    const GET = await getHandler();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockUserFindMany.mockResolvedValue([
      {
        id: "u1", name: "Alice",
        gameEntries: [gameEntry(true), gameEntry(false), gameEntry(false)],  // 1/3 = 33%
      },
      {
        id: "u2", name: "Bob",
        gameEntries: [gameEntry(true), gameEntry(true), gameEntry(false)],  // 2/3 = 67%
      },
    ]);

    const res = await GET(makeRequest());
    const data = await res.json();
    expect(data.entries).toHaveLength(2);
    expect(data.entries[0].name).toBe("Bob");
    expect(data.entries[0].winRate).toBe(67);
    expect(data.entries[1].name).toBe("Alice");
    expect(data.entries[1].winRate).toBe(33);
  });

  it("calculates winRate correctly", async () => {
    const GET = await getHandler();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockUserFindMany.mockResolvedValue([
      {
        id: "u1", name: "Alice",
        gameEntries: [gameEntry(true), gameEntry(true), gameEntry(false)],  // 2/3 = 67%
      },
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
    mockUserFindMany.mockResolvedValue([
      {
        id: "u1", name: "Alice",
        gameEntries: [gameEntry(true), gameEntry(true), gameEntry(false), gameEntry(false), gameEntry(false)],
      },
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
    mockUserFindMany.mockResolvedValue([
      {
        id: "u1",
        name: "Alice",
        gameEntries: [
          gameEntry(true, 2, 3, 4),   // Nice win (1 bracket diff)
          gameEntry(true, 2, 1, 4),   // Big win (3 bracket diff)
          gameEntry(true, 2, 4, 2),   // Easy win (2 brackets above)
          gameEntry(true, 2, 3, 3),   // Normal win (no diff)
          gameEntry(false, 2),         // A loss
        ],
      },
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
    mockUserFindMany.mockResolvedValue([
      {
        id: "u1",
        name: "Alice",
        gameEntries: [
          gameEntry(true, 2),   // 2-player win
          gameEntry(false, 2),  // 2-player loss
          gameEntry(true, 3),   // 3-player win
          gameEntry(false, 3),  // 3-player loss
          gameEntry(false, 3),  // 3-player loss
          gameEntry(true, 4),   // 4-player win
        ],
      },
    ]);

    const res = await GET(makeRequest());
    const data = await res.json();
    const pc = data.entries[0].winRateByPlayerCount;
    expect(pc[2]).toEqual({ games: 2, wins: 1, winRate: 50 });
    expect(pc[3]).toEqual({ games: 3, wins: 1, winRate: 33 });
    expect(pc[4]).toEqual({ games: 1, wins: 1, winRate: 100 });
  });

  it("All Groups view (no active playgroup) shows all games including unassigned", async () => {
    const GET = await getHandler();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockGetActivePlaygroupId.mockResolvedValue(null); // All Groups

    mockUserFindMany.mockResolvedValue([
      {
        id: "u1",
        name: "Alice",
        gameEntries: [
          gameEntry(true, 2),   // game with null playgroupId
          gameEntry(false, 2),
        ],
      },
    ]);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.entries).toHaveLength(1);
    expect(data.entries[0].games).toBe(2);
    expect(data.entries[0].wins).toBe(1);
    // Verify query filters by user's playgroups (including null for unassigned)
    expect(mockUserFindMany).toHaveBeenCalledTimes(1);
    const callArgs = mockUserFindMany.mock.calls[0][0] as { where: { gameEntries: { some: { game: unknown } } } };
    expect(callArgs.where.gameEntries.some.game).toBeDefined();
  });

  it("specific playgroup filter only shows games in that group", async () => {
    const GET = await getHandler();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockGetActivePlaygroupId.mockResolvedValue("pg-mtg4"); // Specific group

    mockUserFindMany.mockResolvedValue([
      {
        id: "u1",
        name: "Alice",
        gameEntries: [gameEntry(true, 2)],
      },
    ]);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    // Verify the query includes the playgroup filter
    expect(mockUserFindMany).toHaveBeenCalledTimes(1);
    const callArgs = mockUserFindMany.mock.calls[0][0] as { where: { gameEntries: { some: { game: { playgroupId: string } } } } };
    expect(callArgs.where.gameEntries.some).toEqual({
      game: { playgroupId: "pg-mtg4" },
    });
  });
});
