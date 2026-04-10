import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockGetCurrentUserId = jest.fn();
jest.mock("@/lib/auth-helpers", () => ({
  getCurrentUserId: () => mockGetCurrentUserId(),
}));

const mockGet = jest.fn();
jest.mock("next/headers", () => ({
  cookies: () => Promise.resolve({ get: mockGet }),
}));

describe("GET /api/playgroups/active", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockGetCurrentUserId.mockResolvedValue(null);
    const { GET } = await import("@/app/api/playgroups/active/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 'all' when no cookie set", async () => {
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockGet.mockReturnValue(undefined);
    const { GET } = await import("@/app/api/playgroups/active/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.playgroupId).toBe("all");
  });

  it("returns cookie value when set", async () => {
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockGet.mockReturnValue({ value: "pg-123" });
    const { GET } = await import("@/app/api/playgroups/active/route");
    const res = await GET();
    const data = await res.json();
    expect(data.playgroupId).toBe("pg-123");
  });
});
