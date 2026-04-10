import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockIsAdmin = jest.fn();
jest.mock("@/lib/auth-helpers", () => ({
  isAdmin: () => mockIsAdmin(),
}));

const mockDeleteMany = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    cardCache: {
      deleteMany: (...args: unknown[]) => mockDeleteMany(...args),
    },
  },
}));

describe("POST /api/admin/clear-card-cache", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 403 when not admin", async () => {
    mockIsAdmin.mockResolvedValue(false);
    const { POST } = await import("@/app/api/admin/clear-card-cache/route");
    const res = await POST();
    expect(res.status).toBe(403);
  });

  it("clears cache", async () => {
    mockIsAdmin.mockResolvedValue(true);
    mockDeleteMany.mockResolvedValue({ count: 5 });
    const { POST } = await import("@/app/api/admin/clear-card-cache/route");
    const res = await POST();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.message).toContain("5");
  });
});
