import { describe, it, expect, jest, beforeEach } from "@jest/globals";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    playgroupMember: { findMany: jest.fn() },
    gamePlayer: { count: jest.fn() },
    game: { count: jest.fn(), findMany: jest.fn() },
  },
}));

jest.mock("@/lib/auth-helpers", () => ({
  getCurrentUserId: jest.fn(),
}));

jest.mock("@/lib/playgroup", () => ({
  getActivePlaygroupId: jest.fn(),
  getPlaygroupIdsForUser: jest.fn(),
  buildGameWhere: jest.fn(),
}));

import { GET } from "@/app/api/admin/my-debug/route";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { getActivePlaygroupId, getPlaygroupIdsForUser, buildGameWhere } from "@/lib/playgroup";

const mockGetUserId = getCurrentUserId as jest.MockedFunction<typeof getCurrentUserId>;
const mockGetActivePg = getActivePlaygroupId as jest.MockedFunction<typeof getActivePlaygroupId>;
const mockGetPgIds = getPlaygroupIdsForUser as jest.MockedFunction<typeof getPlaygroupIdsForUser>;
const mockBuildGameWhere = buildGameWhere as jest.MockedFunction<typeof buildGameWhere>;

beforeEach(() => jest.clearAllMocks());

describe("GET /api/admin/my-debug", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetUserId.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns diagnostic data for authenticated user", async () => {
    mockGetUserId.mockResolvedValue("user-1");
    mockGetActivePg.mockResolvedValue("pg-1");
    mockGetPgIds.mockResolvedValue(["pg-1"]);
    mockBuildGameWhere.mockResolvedValue({ playgroupId: "pg-1" });

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "user-1", name: "Dan", email: "dan@test.com", role: "admin", status: "approved",
    });
    (prisma.playgroupMember.findMany as jest.Mock).mockResolvedValue([
      { playgroupId: "pg-1", role: "admin", playgroup: { id: "pg-1", name: "MTG Night" } },
    ]);
    (prisma.game.count as jest.Mock)
      .mockResolvedValueOnce(10)   // totalGamesInDb
      .mockResolvedValueOnce(8)    // myGamesWithScope
      .mockResolvedValueOnce(9)    // gamesInMyPlaygroups
      .mockResolvedValueOnce(1);   // unassignedGames
    (prisma.gamePlayer.count as jest.Mock).mockResolvedValue(8); // myGamesAsPlayer
    (prisma.game.findMany as jest.Mock).mockResolvedValue([]);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.currentUser.id).toBe("user-1");
    expect(data.playgroupMemberships).toHaveLength(1);
    expect(data.playgroupMemberships[0].playgroupName).toBe("MTG Night");
    expect(data.counts.totalGamesInDb).toBe(10);
    expect(data.counts.myGamesAsPlayer).toBe(8);
    expect(data.activePlaygroupCookie).toBe("pg-1");
  });
});
