import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// Mock auth
const mockIsAdmin = jest.fn();
jest.mock("@/lib/auth-helpers", () => ({
  isAdmin: () => mockIsAdmin(),
}));

// Mock prisma
const mockGameFindUnique = jest.fn();
const mockGameUpdate = jest.fn();
const mockGameDelete = jest.fn();
const mockGamePlayerDeleteMany = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    game: {
      findUnique: (...args: unknown[]) => mockGameFindUnique(...args),
      update: (...args: unknown[]) => mockGameUpdate(...args),
      delete: (...args: unknown[]) => mockGameDelete(...args),
    },
    gamePlayer: {
      deleteMany: (...args: unknown[]) => mockGamePlayerDeleteMany(...args),
    },
  },
}));

const paramsPromise = Promise.resolve({ id: "game-1" });

async function getHandlers() {
  const mod = await import("@/app/api/admin/games/[id]/route");
  return { GET: mod.GET, PUT: mod.PUT, DELETE: mod.DELETE };
}

function makeRequest(method: string, body?: Record<string, unknown>) {
  return new Request("http://localhost/api/admin/games/game-1", {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("GET /api/admin/games/[id]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 403 when not admin", async () => {
    const { GET } = await getHandlers();
    mockIsAdmin.mockResolvedValue(false);
    const res = await GET(makeRequest("GET"), { params: paramsPromise });
    expect(res.status).toBe(403);
  });

  it("returns 404 when game not found", async () => {
    const { GET } = await getHandlers();
    mockIsAdmin.mockResolvedValue(true);
    mockGameFindUnique.mockResolvedValue(null);
    const res = await GET(makeRequest("GET"), { params: paramsPromise });
    expect(res.status).toBe(404);
  });

  it("returns game data", async () => {
    const { GET } = await getHandlers();
    mockIsAdmin.mockResolvedValue(true);
    mockGameFindUnique.mockResolvedValue({ id: "game-1", players: [] });
    const res = await GET(makeRequest("GET"), { params: paramsPromise });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe("game-1");
  });
});

describe("PUT /api/admin/games/[id]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 403 when not admin", async () => {
    const { PUT } = await getHandlers();
    mockIsAdmin.mockResolvedValue(false);
    const res = await PUT(makeRequest("PUT", { playedAt: "2025-01-01" }), {
      params: paramsPromise,
    });
    expect(res.status).toBe(403);
  });

  it("returns 404 when game not found", async () => {
    const { PUT } = await getHandlers();
    mockIsAdmin.mockResolvedValue(true);
    mockGameFindUnique.mockResolvedValue(null);
    const res = await PUT(makeRequest("PUT", { playedAt: "2025-01-01" }), {
      params: paramsPromise,
    });
    expect(res.status).toBe(404);
  });

  it("rejects invalid player count", async () => {
    const { PUT } = await getHandlers();
    mockIsAdmin.mockResolvedValue(true);
    mockGameFindUnique.mockResolvedValue({ id: "game-1", players: [] });
    const res = await PUT(
      makeRequest("PUT", {
        players: [{ userId: "u1", deckId: "d1", isWinner: true }],
      }),
      { params: paramsPromise }
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Games require 2-4 players");
  });

  it("rejects no winner", async () => {
    const { PUT } = await getHandlers();
    mockIsAdmin.mockResolvedValue(true);
    mockGameFindUnique.mockResolvedValue({ id: "game-1", players: [] });
    const res = await PUT(
      makeRequest("PUT", {
        players: [
          { userId: "u1", deckId: "d1", isWinner: false },
          { userId: "u2", deckId: "d2", isWinner: false },
        ],
      }),
      { params: paramsPromise }
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Exactly one winner required");
  });

  it("updates game date without players", async () => {
    const { PUT } = await getHandlers();
    mockIsAdmin.mockResolvedValue(true);
    mockGameFindUnique
      .mockResolvedValueOnce({ id: "game-1", players: [] })
      .mockResolvedValueOnce({ id: "game-1", playedAt: "2025-06-15", players: [] });
    mockGameUpdate.mockResolvedValue({});

    const res = await PUT(
      makeRequest("PUT", { playedAt: "2025-06-15" }),
      { params: paramsPromise }
    );
    expect(res.status).toBe(200);
    expect(mockGameUpdate).toHaveBeenCalled();
  });
});

describe("DELETE /api/admin/games/[id]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 403 when not admin", async () => {
    const { DELETE } = await getHandlers();
    mockIsAdmin.mockResolvedValue(false);
    const res = await DELETE(makeRequest("DELETE"), { params: paramsPromise });
    expect(res.status).toBe(403);
  });

  it("returns 404 when game not found", async () => {
    const { DELETE } = await getHandlers();
    mockIsAdmin.mockResolvedValue(true);
    mockGameFindUnique.mockResolvedValue(null);
    const res = await DELETE(makeRequest("DELETE"), { params: paramsPromise });
    expect(res.status).toBe(404);
  });

  it("deletes game successfully", async () => {
    const { DELETE } = await getHandlers();
    mockIsAdmin.mockResolvedValue(true);
    mockGameFindUnique.mockResolvedValue({ id: "game-1" });
    mockGameDelete.mockResolvedValue({});
    const res = await DELETE(makeRequest("DELETE"), { params: paramsPromise });
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
  });
});
