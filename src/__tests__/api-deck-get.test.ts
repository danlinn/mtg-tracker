import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockFindUnique = jest.fn();
const mockGetCurrentUserId = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    deck: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
    },
  },
}));

jest.mock("@/lib/auth-helpers", () => ({
  getCurrentUserId: () => mockGetCurrentUserId(),
}));

async function getHandler() {
  const mod = await import("@/app/api/decks/[id]/route");
  return mod.GET;
}

describe("GET /api/decks/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetCurrentUserId.mockResolvedValue(null);
    const GET = await getHandler();
    const req = new Request("http://localhost/api/decks/1");
    const res = await GET(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 404 when deck not found", async () => {
    mockGetCurrentUserId.mockResolvedValue("user1");
    mockFindUnique.mockResolvedValue(null);
    const GET = await getHandler();
    const req = new Request("http://localhost/api/decks/1");
    const res = await GET(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(404);
  });

  it("returns 404 when deck belongs to another user", async () => {
    mockGetCurrentUserId.mockResolvedValue("user1");
    mockFindUnique.mockResolvedValue({ id: "1", userId: "user2", name: "Other" });
    const GET = await getHandler();
    const req = new Request("http://localhost/api/decks/1");
    const res = await GET(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(404);
  });

  it("returns deck when owned by current user", async () => {
    mockGetCurrentUserId.mockResolvedValue("user1");
    mockFindUnique.mockResolvedValue({ id: "1", userId: "user1", name: "My Deck", commander: "Krenko" });
    const GET = await getHandler();
    const req = new Request("http://localhost/api/decks/1");
    const res = await GET(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe("My Deck");
  });
});
