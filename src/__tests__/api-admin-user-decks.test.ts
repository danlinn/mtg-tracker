import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockIsAdmin = jest.fn();
jest.mock("@/lib/auth-helpers", () => ({
  isAdmin: () => mockIsAdmin(),
}));

const mockUserFindUnique = jest.fn();
const mockDeckCreate = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
    deck: {
      create: (...args: unknown[]) => mockDeckCreate(...args),
    },
  },
}));

const paramsPromise = Promise.resolve({ id: "user-1" });

describe("GET /api/admin/users/[id]/decks", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 403 when not admin", async () => {
    mockIsAdmin.mockResolvedValue(false);
    const { GET } = await import("@/app/api/admin/users/[id]/decks/route");
    const res = await GET(new Request("http://localhost"), { params: paramsPromise });
    expect(res.status).toBe(403);
  });

  it("returns 404 when user not found", async () => {
    mockIsAdmin.mockResolvedValue(true);
    mockUserFindUnique.mockResolvedValue(null);
    const { GET } = await import("@/app/api/admin/users/[id]/decks/route");
    const res = await GET(new Request("http://localhost"), { params: paramsPromise });
    expect(res.status).toBe(404);
  });

  it("returns user with decks", async () => {
    mockIsAdmin.mockResolvedValue(true);
    mockUserFindUnique.mockResolvedValue({
      id: "user-1",
      name: "Alice",
      email: "alice@test.com",
      role: "user",
      decks: [{ id: "d1", name: "Krenko" }],
    });
    const { GET } = await import("@/app/api/admin/users/[id]/decks/route");
    const res = await GET(new Request("http://localhost"), { params: paramsPromise });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.decks).toHaveLength(1);
  });
});

describe("POST /api/admin/users/[id]/decks", () => {
  beforeEach(() => jest.clearAllMocks());

  function makeRequest(body: Record<string, unknown>) {
    return new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("returns 403 when not admin", async () => {
    mockIsAdmin.mockResolvedValue(false);
    const { POST } = await import("@/app/api/admin/users/[id]/decks/route");
    const res = await POST(makeRequest({ name: "x", commander: "y" }), {
      params: paramsPromise,
    });
    expect(res.status).toBe(403);
  });

  it("returns 404 when user not found", async () => {
    mockIsAdmin.mockResolvedValue(true);
    mockUserFindUnique.mockResolvedValue(null);
    const { POST } = await import("@/app/api/admin/users/[id]/decks/route");
    const res = await POST(makeRequest({ name: "x", commander: "y" }), {
      params: paramsPromise,
    });
    expect(res.status).toBe(404);
  });

  it("returns 400 when name or commander missing", async () => {
    mockIsAdmin.mockResolvedValue(true);
    mockUserFindUnique.mockResolvedValue({ id: "user-1" });
    const { POST } = await import("@/app/api/admin/users/[id]/decks/route");
    const res = await POST(makeRequest({ name: "x" }), {
      params: paramsPromise,
    });
    expect(res.status).toBe(400);
  });

  it("creates deck for target user", async () => {
    mockIsAdmin.mockResolvedValue(true);
    mockUserFindUnique.mockResolvedValue({ id: "user-1" });
    mockDeckCreate.mockResolvedValue({ id: "d1", name: "Test Deck" });
    const { POST } = await import("@/app/api/admin/users/[id]/decks/route");
    const res = await POST(
      makeRequest({
        name: "Test Deck",
        commander: "Test Commander",
        colors: { R: true },
      }),
      { params: paramsPromise }
    );
    expect(res.status).toBe(200);
    // Verify userId was set to the target user, not the admin
    expect(mockDeckCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          name: "Test Deck",
        }),
      })
    );
  });
});
