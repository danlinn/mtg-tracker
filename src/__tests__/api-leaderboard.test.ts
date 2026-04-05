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

describe("GET /api/leaderboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    const GET = await getHandler();
    mockGetCurrentUserId.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns empty array when no users have games", async () => {
    const GET = await getHandler();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockUserFindMany.mockResolvedValue([
      { id: "u1", name: "Alice", gameEntries: [] },
    ]);

    const res = await GET();
    const data = await res.json();
    expect(data).toEqual([]);
  });

  it("sorts by wins descending, then winRate", async () => {
    const GET = await getHandler();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockUserFindMany.mockResolvedValue([
      { id: "u1", name: "Alice", gameEntries: [{ isWinner: true }, { isWinner: false }] },
      { id: "u2", name: "Bob", gameEntries: [{ isWinner: true }, { isWinner: true }, { isWinner: false }] },
      { id: "u3", name: "Charlie", gameEntries: [{ isWinner: true }, { isWinner: false }] },
    ]);

    const res = await GET();
    const data = await res.json();
    expect(data).toHaveLength(3);
    expect(data[0].name).toBe("Bob"); // 2 wins
    expect(data[0].wins).toBe(2);
    expect(data[1].wins).toBe(1); // Alice and Charlie tied at 1 win
  });

  it("filters out users with zero games", async () => {
    const GET = await getHandler();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockUserFindMany.mockResolvedValue([
      { id: "u1", name: "Active", gameEntries: [{ isWinner: true }] },
      { id: "u2", name: "Inactive", gameEntries: [] },
    ]);

    const res = await GET();
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe("Active");
  });

  it("calculates winRate correctly", async () => {
    const GET = await getHandler();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockUserFindMany.mockResolvedValue([
      { id: "u1", name: "Alice", gameEntries: [{ isWinner: true }, { isWinner: true }, { isWinner: false }] },
    ]);

    const res = await GET();
    const data = await res.json();
    expect(data[0].winRate).toBe(67);
    expect(data[0].games).toBe(3);
  });
});
