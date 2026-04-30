import { describe, it, expect, jest, beforeEach } from "@jest/globals";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: jest.fn(), update: jest.fn() },
  },
}));

jest.mock("@/lib/auth-helpers", () => ({
  getCurrentUserId: jest.fn(),
}));

import { GET, PUT } from "@/app/api/profile/route";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth-helpers";

const mockGetUserId = getCurrentUserId as jest.MockedFunction<typeof getCurrentUserId>;

beforeEach(() => jest.clearAllMocks());

describe("GET /api/profile", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetUserId.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns user profile", async () => {
    mockGetUserId.mockResolvedValue("user-1");
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "user-1", name: "Dan", email: "dan@test.com", moxfieldUsername: "danlinn",
    });
    const res = await GET();
    const data = await res.json();
    expect(data.moxfieldUsername).toBe("danlinn");
  });
});

describe("PUT /api/profile", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetUserId.mockResolvedValue(null);
    const res = await PUT(new Request("http://localhost/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moxfieldUsername: "test" }),
    }));
    expect(res.status).toBe(401);
  });

  it("updates moxfieldUsername", async () => {
    mockGetUserId.mockResolvedValue("user-1");
    (prisma.user.update as jest.Mock).mockResolvedValue({
      id: "user-1", name: "Dan", email: "dan@test.com", moxfieldUsername: "newname",
    });
    const res = await PUT(new Request("http://localhost/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moxfieldUsername: "newname" }),
    }));
    const data = await res.json();
    expect(data.moxfieldUsername).toBe("newname");
  });

  it("clears moxfieldUsername with empty string", async () => {
    mockGetUserId.mockResolvedValue("user-1");
    (prisma.user.update as jest.Mock).mockResolvedValue({
      id: "user-1", name: "Dan", email: "dan@test.com", moxfieldUsername: null,
    });
    const res = await PUT(new Request("http://localhost/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moxfieldUsername: "" }),
    }));
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { moxfieldUsername: null } })
    );
  });

  it("rejects with no valid fields", async () => {
    mockGetUserId.mockResolvedValue("user-1");
    const res = await PUT(new Request("http://localhost/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ randomField: "value" }),
    }));
    expect(res.status).toBe(400);
  });
});
