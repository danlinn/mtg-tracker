import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockGetCurrentUserId = jest.fn();
jest.mock("@/lib/auth-helpers", () => ({
  getCurrentUserId: () => mockGetCurrentUserId(),
}));

const mockIsPlaygroupMember = jest.fn();
jest.mock("@/lib/playgroup", () => ({
  isPlaygroupMember: (...args: unknown[]) => mockIsPlaygroupMember(...args),
}));

// Mock next/headers cookies
const mockSet = jest.fn();
jest.mock("next/headers", () => ({
  cookies: () => Promise.resolve({ set: mockSet }),
}));

describe("POST /api/playgroups/switch", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockGetCurrentUserId.mockResolvedValue(null);
    const { POST } = await import("@/app/api/playgroups/switch/route");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playgroupId: "pg1" }),
      })
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 when not a member", async () => {
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockIsPlaygroupMember.mockResolvedValue(false);
    const { POST } = await import("@/app/api/playgroups/switch/route");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playgroupId: "pg1" }),
      })
    );
    expect(res.status).toBe(403);
  });

  it("switches to a playgroup", async () => {
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockIsPlaygroupMember.mockResolvedValue(true);
    const { POST } = await import("@/app/api/playgroups/switch/route");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playgroupId: "pg1" }),
      })
    );
    expect(res.status).toBe(200);
    expect(mockSet).toHaveBeenCalledWith(
      "mtg-active-playgroup",
      "pg1",
      expect.any(Object)
    );
  });

  it("switches to all groups", async () => {
    mockGetCurrentUserId.mockResolvedValue("user-1");
    const { POST } = await import("@/app/api/playgroups/switch/route");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playgroupId: "all" }),
      })
    );
    expect(res.status).toBe(200);
  });

  it("does not check membership when switching to 'all'", async () => {
    mockGetCurrentUserId.mockResolvedValue("user-1");
    const { POST } = await import("@/app/api/playgroups/switch/route");
    await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playgroupId: "all" }),
      })
    );
    // "all" should not require membership check
    expect(mockIsPlaygroupMember).not.toHaveBeenCalled();
  });
});
