import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockGetCurrentUserId = jest.fn();
jest.mock("@/lib/auth-helpers", () => ({
  getCurrentUserId: () => mockGetCurrentUserId(),
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

// Helper: create a winning game entry with players
function winEntry(winBracket: number | null = null, loserBracket: number | null = null) {
  return {
    id: `w-${Math.random()}`,
    game: {
      players: [
        { isWinner: true, deck: { bracket: winBracket, edhp: null } },
        { isWinner: false, deck: { bracket: loserBracket, edhp: null } },
      ],
    },
  };
}

describe("GET /api/leaderboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it("sorts by wins descending, then winRate", async () => {
    const GET = await getHandler();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockUserFindMany.mockResolvedValue([
      { id: "u1", name: "Alice", _count: { gameEntries: 2 }, gameEntries: [winEntry()] },
      { id: "u2", name: "Bob", _count: { gameEntries: 3 }, gameEntries: [winEntry(), winEntry()] },
    ]);

    const res = await GET(makeRequest());
    const data = await res.json();
    expect(data.entries).toHaveLength(2);
    expect(data.entries[0].name).toBe("Bob");
    expect(data.entries[0].wins).toBe(2);
  });

  it("calculates winRate correctly", async () => {
    const GET = await getHandler();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockUserFindMany.mockResolvedValue([
      { id: "u1", name: "Alice", _count: { gameEntries: 3 }, gameEntries: [winEntry(), winEntry()] },
    ]);

    const res = await GET(makeRequest());
    const data = await res.json();
    expect(data.entries[0].winRate).toBe(67);
    expect(data.entries[0].games).toBe(3);
  });

  it("paginates results", async () => {
    const GET = await getHandler();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockUserFindMany.mockResolvedValue([
      { id: "u1", name: "Alice", _count: { gameEntries: 5 }, gameEntries: [winEntry(), winEntry(), winEntry()] },
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
        _count: { gameEntries: 5 },
        gameEntries: [
          winEntry(3, 4),  // Nice win (1 bracket diff)
          winEntry(1, 4),  // Big win (3 bracket diff)
          winEntry(4, 2),  // Easy win (2 brackets above)
          winEntry(3, 3),  // Normal win (no diff)
        ],
      },
    ]);

    const res = await GET(makeRequest());
    const data = await res.json();
    expect(data.entries[0].niceWins).toBe(1);
    expect(data.entries[0].bigWins).toBe(1);
    expect(data.entries[0].easyWins).toBe(1);
  });
});
