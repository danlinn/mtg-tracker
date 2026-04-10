import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockIsAdmin = jest.fn();
jest.mock("@/lib/auth-helpers", () => ({
  isAdmin: () => mockIsAdmin(),
}));

const mockUserCount = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      count: (...args: unknown[]) => mockUserCount(...args),
    },
  },
}));

describe("GET /api/admin/pending-count", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 403 when not admin", async () => {
    mockIsAdmin.mockResolvedValue(false);
    const { GET } = await import("@/app/api/admin/pending-count/route");
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns pending count", async () => {
    mockIsAdmin.mockResolvedValue(true);
    mockUserCount.mockResolvedValue(3);
    const { GET } = await import("@/app/api/admin/pending-count/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.count).toBe(3);
  });

  it("returns 0 when no pending users", async () => {
    mockIsAdmin.mockResolvedValue(true);
    mockUserCount.mockResolvedValue(0);
    const { GET } = await import("@/app/api/admin/pending-count/route");
    const res = await GET();
    const data = await res.json();
    expect(data.count).toBe(0);
  });
});
