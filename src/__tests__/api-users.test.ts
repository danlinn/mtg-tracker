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
  const mod = await import("@/app/api/users/route");
  return mod.GET;
}

function makeRequest(query = "") {
  return new Request(`http://localhost/api/users${query ? `?${query}` : ""}`);
}

describe("GET /api/users", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    const GET = await getHandler();
    mockGetCurrentUserId.mockResolvedValue(null);
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns all users with decks when no playgroup filter", async () => {
    const GET = await getHandler();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockUserFindMany.mockResolvedValue([
      { id: "u1", name: "Alice", decks: [{ id: "d1", name: "Deck", commander: "C", edhp: null, bracket: null }] },
      { id: "u2", name: "Bob", decks: [] },
    ]);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(2);
    // Should not have a playgroup filter
    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} })
    );
  });

  it("returns all users when playgroupId=all", async () => {
    const GET = await getHandler();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockUserFindMany.mockResolvedValue([]);

    await GET(makeRequest("playgroupId=all"));
    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} })
    );
  });

  it("filters by playgroup membership when specific playgroup given", async () => {
    const GET = await getHandler();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockUserFindMany.mockResolvedValue([]);

    await GET(makeRequest("playgroupId=pg-mtg4"));
    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { playgroupMembers: { some: { playgroupId: "pg-mtg4" } } },
      })
    );
  });
});
