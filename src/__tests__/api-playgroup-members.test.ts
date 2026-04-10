import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockGetCurrentUserId = jest.fn();
const mockIsAdmin = jest.fn();
jest.mock("@/lib/auth-helpers", () => ({
  getCurrentUserId: () => mockGetCurrentUserId(),
  isAdmin: () => mockIsAdmin(),
}));

const mockMemberFindMany = jest.fn();
const mockMemberFindUnique = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    playgroupMember: {
      findMany: (...args: unknown[]) => mockMemberFindMany(...args),
      findUnique: (...args: unknown[]) => mockMemberFindUnique(...args),
    },
  },
}));

const params = Promise.resolve({ id: "pg1" });

describe("GET /api/playgroups/[id]/members", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockGetCurrentUserId.mockResolvedValue(null);
    const { GET } = await import("@/app/api/playgroups/[id]/members/route");
    const res = await GET(new Request("http://localhost"), { params });
    expect(res.status).toBe(401);
  });

  it("returns 403 when not member and not admin", async () => {
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockIsAdmin.mockResolvedValue(false);
    mockMemberFindUnique.mockResolvedValue(null);
    const { GET } = await import("@/app/api/playgroups/[id]/members/route");
    const res = await GET(new Request("http://localhost"), { params });
    expect(res.status).toBe(403);
  });

  it("returns members when user is member", async () => {
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockIsAdmin.mockResolvedValue(false);
    mockMemberFindUnique.mockResolvedValue({ id: "m1", role: "member" });
    mockMemberFindMany.mockResolvedValue([
      { id: "m1", role: "member", joinedAt: new Date(), user: { id: "u1", name: "Alice", email: "a@b.com" } },
    ]);
    const { GET } = await import("@/app/api/playgroups/[id]/members/route");
    const res = await GET(new Request("http://localhost"), { params });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].user.name).toBe("Alice");
  });

  it("site admin can view members without being a member", async () => {
    mockGetCurrentUserId.mockResolvedValue("admin-1");
    mockIsAdmin.mockResolvedValue(true);
    mockMemberFindMany.mockResolvedValue([]);
    const { GET } = await import("@/app/api/playgroups/[id]/members/route");
    const res = await GET(new Request("http://localhost"), { params });
    expect(res.status).toBe(200);
  });
});
