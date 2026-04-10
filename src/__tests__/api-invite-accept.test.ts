import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockGetCurrentUserId = jest.fn();
jest.mock("@/lib/auth-helpers", () => ({
  getCurrentUserId: () => mockGetCurrentUserId(),
}));

const mockInviteFindUnique = jest.fn();
const mockInviteUpdate = jest.fn();
const mockMemberFindUnique = jest.fn();
const mockMemberCreate = jest.fn();
const mockUserUpdate = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    playgroupInvite: {
      findUnique: (...args: unknown[]) => mockInviteFindUnique(...args),
      update: (...args: unknown[]) => mockInviteUpdate(...args),
    },
    playgroupMember: {
      findUnique: (...args: unknown[]) => mockMemberFindUnique(...args),
      create: (...args: unknown[]) => mockMemberCreate(...args),
    },
    user: {
      update: (...args: unknown[]) => mockUserUpdate(...args),
    },
  },
}));

async function getHandler() {
  const mod = await import("@/app/api/invites/accept/route");
  return mod.GET;
}

describe("GET /api/invites/accept", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 400 when no token", async () => {
    const GET = await getHandler();
    const res = await GET(new Request("http://localhost/api/invites/accept"));
    expect(res.status).toBe(400);
  });

  it("returns 404 for invalid token", async () => {
    mockInviteFindUnique.mockResolvedValue(null);
    const GET = await getHandler();
    const res = await GET(new Request("http://localhost/api/invites/accept?token=bad"));
    expect(res.status).toBe(404);
  });

  it("returns 410 for expired invite", async () => {
    mockInviteFindUnique.mockResolvedValue({
      id: "inv1",
      token: "tok1",
      expiresAt: new Date("2020-01-01"),
      usedAt: null,
      playgroupId: "pg1",
      playgroup: { name: "Group" },
    });
    const GET = await getHandler();
    const res = await GET(new Request("http://localhost/api/invites/accept?token=tok1"));
    expect(res.status).toBe(410);
  });

  it("returns 410 for already used invite", async () => {
    mockInviteFindUnique.mockResolvedValue({
      id: "inv1",
      token: "tok1",
      expiresAt: new Date("2099-01-01"),
      usedAt: new Date(),
      playgroupId: "pg1",
      playgroup: { name: "Group" },
    });
    const GET = await getHandler();
    const res = await GET(new Request("http://localhost/api/invites/accept?token=tok1"));
    expect(res.status).toBe(410);
  });

  it("redirects to sign-up if not logged in", async () => {
    mockGetCurrentUserId.mockResolvedValue(null);
    mockInviteFindUnique.mockResolvedValue({
      id: "inv1",
      token: "tok1",
      expiresAt: new Date("2099-01-01"),
      usedAt: null,
      email: null,
      playgroupId: "pg1",
      playgroup: { name: "Group" },
    });
    const GET = await getHandler();
    const res = await GET(new Request("http://localhost/api/invites/accept?token=tok1"));
    expect([301, 302, 307, 308]).toContain(res.status);
    expect(res.headers.get("location")).toContain("/sign-up-here?invite=tok1");
  });

  it("adds logged-in user to playgroup", async () => {
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockInviteFindUnique.mockResolvedValue({
      id: "inv1",
      token: "tok1",
      expiresAt: new Date("2099-01-01"),
      usedAt: null,
      email: null,
      playgroupId: "pg1",
      playgroup: { name: "Friday Night" },
    });
    mockMemberFindUnique.mockResolvedValue(null);
    mockMemberCreate.mockResolvedValue({});
    mockUserUpdate.mockResolvedValue({});
    const GET = await getHandler();
    const res = await GET(new Request("http://localhost/api/invites/accept?token=tok1"));
    expect([301, 302, 307, 308]).toContain(res.status);
    expect(res.headers.get("location")).toContain("/dashboard");
    expect(mockMemberCreate).toHaveBeenCalledTimes(1);
    expect(mockUserUpdate).toHaveBeenCalledTimes(1);
  });

  it("marks email invite as used", async () => {
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockInviteFindUnique.mockResolvedValue({
      id: "inv1",
      token: "tok1",
      expiresAt: new Date("2099-01-01"),
      usedAt: null,
      email: "user@test.com",
      playgroupId: "pg1",
      playgroup: { name: "Group" },
    });
    mockMemberFindUnique.mockResolvedValue(null);
    mockMemberCreate.mockResolvedValue({});
    mockUserUpdate.mockResolvedValue({});
    mockInviteUpdate.mockResolvedValue({});
    const GET = await getHandler();
    await GET(new Request("http://localhost/api/invites/accept?token=tok1"));
    expect(mockInviteUpdate).toHaveBeenCalledTimes(1);
  });

  it("skips creating member if already a member", async () => {
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockInviteFindUnique.mockResolvedValue({
      id: "inv1",
      token: "tok1",
      expiresAt: new Date("2099-01-01"),
      usedAt: null,
      email: null,
      playgroupId: "pg1",
      playgroup: { name: "Group" },
    });
    mockMemberFindUnique.mockResolvedValue({ id: "existing" });
    mockUserUpdate.mockResolvedValue({});
    const GET = await getHandler();
    await GET(new Request("http://localhost/api/invites/accept?token=tok1"));
    expect(mockMemberCreate).not.toHaveBeenCalled();
  });
});
