import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockGetCurrentUserId = jest.fn();
jest.mock("@/lib/auth-helpers", () => ({
  getCurrentUserId: () => mockGetCurrentUserId(),
}));

const mockMemberFindMany = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    playgroupMember: {
      findMany: (...args: unknown[]) => mockMemberFindMany(...args),
    },
  },
}));

describe("GET /api/playgroups", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockGetCurrentUserId.mockResolvedValue(null);
    const { GET } = await import("@/app/api/playgroups/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns user playgroups", async () => {
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockMemberFindMany.mockResolvedValue([
      {
        role: "member",
        playgroup: {
          id: "pg1",
          name: "Friday Night",
          description: null,
          _count: { members: 4, games: 10 },
        },
      },
    ]);
    const { GET } = await import("@/app/api/playgroups/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe("Friday Night");
    expect(data[0].role).toBe("member");
    expect(data[0].memberCount).toBe(4);
  });
});
