import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockIsAdmin = jest.fn();
jest.mock("@/lib/auth-helpers", () => ({
  isAdmin: () => mockIsAdmin(),
}));

const mockUserFindUnique = jest.fn();
const mockUserUpdate = jest.fn();
const mockMemberFindUnique = jest.fn();
const mockMemberCreate = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
      update: (...args: unknown[]) => mockUserUpdate(...args),
    },
    playgroupMember: {
      findUnique: (...args: unknown[]) => mockMemberFindUnique(...args),
      create: (...args: unknown[]) => mockMemberCreate(...args),
    },
  },
}));

jest.mock("@/lib/email", () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true } as never),
}));

async function getHandler() {
  const mod = await import("@/app/api/admin/approve/route");
  return mod.POST;
}

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/admin/approve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/approve", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 403 when not admin", async () => {
    mockIsAdmin.mockResolvedValue(false);
    const POST = await getHandler();
    const res = await POST(makeRequest({ userId: "u1", action: "approve" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 when missing fields", async () => {
    mockIsAdmin.mockResolvedValue(true);
    const POST = await getHandler();
    const res = await POST(makeRequest({ userId: "u1" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when user not found", async () => {
    mockIsAdmin.mockResolvedValue(true);
    mockUserFindUnique.mockResolvedValue(null);
    const POST = await getHandler();
    const res = await POST(makeRequest({ userId: "u1", action: "approve" }));
    expect(res.status).toBe(404);
  });

  it("approves user", async () => {
    mockIsAdmin.mockResolvedValue(true);
    mockUserFindUnique.mockResolvedValue({ id: "u1", email: "a@b.com", name: "Alice" });
    mockUserUpdate.mockResolvedValue({});
    const POST = await getHandler();
    const res = await POST(makeRequest({ userId: "u1", action: "approve" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("approved");
  });

  it("approves user and assigns to playgroups", async () => {
    mockIsAdmin.mockResolvedValue(true);
    mockUserFindUnique.mockResolvedValue({ id: "u1", email: "a@b.com", name: "Alice" });
    mockUserUpdate.mockResolvedValue({});
    mockMemberFindUnique.mockResolvedValue(null);
    mockMemberCreate.mockResolvedValue({});
    const POST = await getHandler();
    const res = await POST(
      makeRequest({
        userId: "u1",
        action: "approve",
        playgroupIds: ["pg1", "pg2"],
      })
    );
    expect(res.status).toBe(200);
    expect(mockMemberCreate).toHaveBeenCalledTimes(2);
  });

  it("rejects user", async () => {
    mockIsAdmin.mockResolvedValue(true);
    mockUserFindUnique.mockResolvedValue({ id: "u1", email: "a@b.com", name: "Alice" });
    mockUserUpdate.mockResolvedValue({});
    const POST = await getHandler();
    const res = await POST(makeRequest({ userId: "u1", action: "reject" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("rejected");
  });

  it("returns 400 for invalid action", async () => {
    mockIsAdmin.mockResolvedValue(true);
    const POST = await getHandler();
    const res = await POST(makeRequest({ userId: "u1", action: "ban" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when userId is missing", async () => {
    mockIsAdmin.mockResolvedValue(true);
    const POST = await getHandler();
    const res = await POST(makeRequest({ action: "approve" }));
    expect(res.status).toBe(400);
  });

  it("does not create duplicate playgroup memberships", async () => {
    mockIsAdmin.mockResolvedValue(true);
    mockUserFindUnique.mockResolvedValue({ id: "u1", email: "a@b.com", name: "Alice" });
    mockUserUpdate.mockResolvedValue({});
    // User is already a member
    mockMemberFindUnique.mockResolvedValue({ id: "existing-member" });
    mockMemberCreate.mockResolvedValue({});
    const POST = await getHandler();
    const res = await POST(
      makeRequest({
        userId: "u1",
        action: "approve",
        playgroupIds: ["pg1"],
      })
    );
    expect(res.status).toBe(200);
    // Should NOT have called create since member already exists
    expect(mockMemberCreate).not.toHaveBeenCalled();
  });
});
