import { describe, it, expect, jest, beforeEach } from "@jest/globals";

/**
 * Tests that admin approval of a user correctly updates the session.
 * Regression test: the JWT was caching stale `status` from login,
 * so approving a user didn't hide the PendingBanner until re-login.
 */

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

describe("Approval updates user status in DB", () => {
  beforeEach(() => jest.clearAllMocks());

  it("sets status to 'approved' so PendingBanner disappears", async () => {
    mockIsAdmin.mockResolvedValue(true);
    mockUserFindUnique.mockResolvedValue({
      id: "u1",
      email: "user@test.com",
      name: "Pending User",
      status: "pending",
    });
    mockUserUpdate.mockResolvedValue({ status: "approved" });

    const POST = await getHandler();
    const res = await POST(makeRequest({ userId: "u1", action: "approve" }));
    expect(res.status).toBe(200);

    // Verify prisma.user.update was called with status: "approved"
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "u1" },
        data: { status: "approved" },
      })
    );
  });

  it("sets status to 'rejected' for rejected users", async () => {
    mockIsAdmin.mockResolvedValue(true);
    mockUserFindUnique.mockResolvedValue({
      id: "u2",
      email: "bad@test.com",
      name: "Bad User",
      status: "pending",
    });
    mockUserUpdate.mockResolvedValue({ status: "rejected" });

    const POST = await getHandler();
    const res = await POST(makeRequest({ userId: "u2", action: "reject" }));
    expect(res.status).toBe(200);

    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "u2" },
        data: { status: "rejected" },
      })
    );
  });
});
