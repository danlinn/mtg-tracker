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
      { id: "u1", name: "Alice", _count: { gameEntries: 2 }, gameEntries: [{ id: "w1" }] },
      { id: "u2", name: "Bob", _count: { gameEntries: 3 }, gameEntries: [{ id: "w1" }, { id: "w2" }] },
      { id: "u3", name: "Charlie", _count: { gameEntries: 2 }, gameEntries: [{ id: "w1" }] },
    ]);

    const res = await GET(makeRequest());
    const data = await res.json();
    expect(data.entries).toHaveLength(3);
    expect(data.entries[0].name).toBe("Bob");
    expect(data.entries[0].wins).toBe(2);
    expect(data.entries[1].wins).toBe(1);
  });

  it("calculates winRate correctly", async () => {
    const GET = await getHandler();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockUserFindMany.mockResolvedValue([
      { id: "u1", name: "Alice", _count: { gameEntries: 3 }, gameEntries: [{ id: "w1" }, { id: "w2" }] },
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
      { id: "u1", name: "Alice", _count: { gameEntries: 5 }, gameEntries: [{ id: "w1" }, { id: "w2" }, { id: "w3" }] },
    ]);

    const res = await GET(makeRequest("page=1&perPage=20"));
    const data = await res.json();
    expect(data.page).toBe(1);
    expect(data.perPage).toBe(20);
    expect(data.totalPages).toBe(1);
  });
});
