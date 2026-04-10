import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockGetCurrentUserId = jest.fn();
const mockIsAdmin = jest.fn();
jest.mock("@/lib/auth-helpers", () => ({
  getCurrentUserId: () => mockGetCurrentUserId(),
  isAdmin: () => mockIsAdmin(),
}));

const mockMemberFindUnique = jest.fn();
const mockInviteFindMany = jest.fn();
const mockInviteCreate = jest.fn();
const mockUserFindUnique = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    playgroupMember: {
      findUnique: (...args: unknown[]) => mockMemberFindUnique(...args),
    },
    playgroupInvite: {
      findMany: (...args: unknown[]) => mockInviteFindMany(...args),
      create: (...args: unknown[]) => mockInviteCreate(...args),
    },
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
  },
}));

jest.mock("@/lib/email", () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true } as never),
}));

const params = Promise.resolve({ id: "pg1" });

describe("GET /api/playgroups/[id]/invites", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockGetCurrentUserId.mockResolvedValue(null);
    const { GET } = await import("@/app/api/playgroups/[id]/invites/route");
    const res = await GET(new Request("http://localhost"), { params });
    expect(res.status).toBe(401);
  });

  it("returns 403 when not member and not admin", async () => {
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockIsAdmin.mockResolvedValue(false);
    mockMemberFindUnique.mockResolvedValue(null);
    const { GET } = await import("@/app/api/playgroups/[id]/invites/route");
    const res = await GET(new Request("http://localhost"), { params });
    expect(res.status).toBe(403);
  });

  it("returns invites for member", async () => {
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockIsAdmin.mockResolvedValue(false);
    mockMemberFindUnique.mockResolvedValue({ id: "m1" });
    mockInviteFindMany.mockResolvedValue([]);
    const { GET } = await import("@/app/api/playgroups/[id]/invites/route");
    const res = await GET(new Request("http://localhost"), { params });
    expect(res.status).toBe(200);
  });
});

describe("POST /api/playgroups/[id]/invites", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockGetCurrentUserId.mockResolvedValue(null);
    const { POST } = await import("@/app/api/playgroups/[id]/invites/route");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      { params }
    );
    expect(res.status).toBe(401);
  });

  it("creates invite without email (link only)", async () => {
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockIsAdmin.mockResolvedValue(false);
    mockMemberFindUnique.mockResolvedValue({ id: "m1" });
    mockInviteCreate.mockResolvedValue({
      id: "inv1",
      token: "tok123",
      email: null,
      expiresAt: new Date(),
      playgroup: { name: "Group" },
    });
    const { POST } = await import("@/app/api/playgroups/[id]/invites/route");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      { params }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.token).toBe("tok123");
  });

  it("creates invite with email", async () => {
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockIsAdmin.mockResolvedValue(false);
    mockMemberFindUnique.mockResolvedValue({ id: "m1" });
    mockInviteCreate.mockResolvedValue({
      id: "inv1",
      token: "tok456",
      email: "friend@test.com",
      expiresAt: new Date(),
      playgroup: { name: "Friday Night" },
    });
    mockUserFindUnique.mockResolvedValue({ name: "Alice" });
    const { POST } = await import("@/app/api/playgroups/[id]/invites/route");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "friend@test.com" }),
      }),
      { params }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.email).toBe("friend@test.com");
  });

  it("site admin can create invite without being member", async () => {
    mockGetCurrentUserId.mockResolvedValue("admin-1");
    mockIsAdmin.mockResolvedValue(true);
    mockInviteCreate.mockResolvedValue({
      id: "inv1",
      token: "tok789",
      email: null,
      expiresAt: new Date(),
      playgroup: { name: "Group" },
    });
    const { POST } = await import("@/app/api/playgroups/[id]/invites/route");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      { params }
    );
    expect(res.status).toBe(200);
  });
});
