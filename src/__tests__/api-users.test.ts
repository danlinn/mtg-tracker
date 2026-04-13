import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockGetCurrentUserId = jest.fn();
jest.mock("@/lib/auth-helpers", () => ({
  getCurrentUserId: () => mockGetCurrentUserId(),
}));

const mockGetActivePlaygroupId = jest.fn();
const mockGetPlaygroupIdsForUser = jest.fn();
jest.mock("@/lib/playgroup", () => ({
  getActivePlaygroupId: () => mockGetActivePlaygroupId(),
  getPlaygroupIdsForUser: (...args: unknown[]) => mockGetPlaygroupIdsForUser(...args),
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
    // Default: no active playgroup, user has pg1
    mockGetActivePlaygroupId.mockResolvedValue(null);
    mockGetPlaygroupIdsForUser.mockResolvedValue(["pg1"]);
  });

  it("returns 401 when not authenticated", async () => {
    const GET = await getHandler();
    mockGetCurrentUserId.mockResolvedValue(null);
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("defaults to active playgroup from cookie when present", async () => {
    const GET = await getHandler();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockGetActivePlaygroupId.mockResolvedValue("pg-mtg4");
    mockUserFindMany.mockResolvedValue([]);

    await GET(makeRequest());
    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { playgroupMembers: { some: { playgroupId: "pg-mtg4" } } },
      })
    );
  });

  it("scopes to user's playgroups + self when All Groups active", async () => {
    const GET = await getHandler();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockGetActivePlaygroupId.mockResolvedValue(null);
    mockGetPlaygroupIdsForUser.mockResolvedValue(["pg1", "pg2"]);
    mockUserFindMany.mockResolvedValue([]);

    await GET(makeRequest());
    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { playgroupMembers: { some: { playgroupId: { in: ["pg1", "pg2"] } } } },
            { id: "user-1" },
          ],
        },
      })
    );
  });

  it("returns all users when user has no playgroups and no override", async () => {
    const GET = await getHandler();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockGetActivePlaygroupId.mockResolvedValue(null);
    mockGetPlaygroupIdsForUser.mockResolvedValue([]);
    mockUserFindMany.mockResolvedValue([]);

    await GET(makeRequest());
    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} })
    );
  });

  it("explicit ?playgroupId=all bypasses all scoping", async () => {
    const GET = await getHandler();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockGetActivePlaygroupId.mockResolvedValue("pg-mtg4"); // cookie would normally scope
    mockUserFindMany.mockResolvedValue([]);

    await GET(makeRequest("playgroupId=all"));
    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} })
    );
  });

  it("explicit ?playgroupId=X overrides cookie", async () => {
    const GET = await getHandler();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockGetActivePlaygroupId.mockResolvedValue("pg-other");
    mockUserFindMany.mockResolvedValue([]);

    await GET(makeRequest("playgroupId=pg-mtg4"));
    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { playgroupMembers: { some: { playgroupId: "pg-mtg4" } } },
      })
    );
  });
});
