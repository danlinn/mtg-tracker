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
      findMany: (...args: unknown[]) => mockGameFindMany(...args),
      update: (...args: unknown[]) => mockGameUpdate(...args),
      delete: (...args: unknown[]) => mockGameDelete(...args),
    },
    gamePlayer: {
      deleteMany: (...args: unknown[]) => mockGamePlayerDeleteMany(...args),
    },
  },
}));

const paramsPromise = Promise.resolve({ id: "game-1" });

const mockGameFindMany = jest.fn();

async function getHandlers() {
  const mod = await import("@/app/api/admin/games/[id]/route");
  return { GET: mod.GET, PUT: mod.PUT, DELETE: mod.DELETE, PATCH: mod.PATCH };
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

describe("PATCH /api/admin/games/[id]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 403 when not admin", async () => {
    const { PATCH } = await getHandlers();
    mockIsAdmin.mockResolvedValue(false);
    const res = await PATCH(makeRequest("PATCH", { playgroupId: "pg1" }), {
      params: paramsPromise,
    });
    expect(res.status).toBe(403);
  });

  it("returns 404 when game not found", async () => {
    const { PATCH } = await getHandlers();
    mockIsAdmin.mockResolvedValue(true);
    mockGameFindUnique.mockResolvedValue(null);
    const res = await PATCH(makeRequest("PATCH", { playgroupId: "pg1" }), {
      params: paramsPromise,
    });
    expect(res.status).toBe(404);
  });

  it("assigns a playgroup to a game", async () => {
    const { PATCH } = await getHandlers();
    mockIsAdmin.mockResolvedValue(true);
    mockGameFindUnique.mockResolvedValue({ id: "game-1" });
    mockGameUpdate.mockResolvedValue({ id: "game-1", playgroupId: "pg1" });
    const res = await PATCH(makeRequest("PATCH", { playgroupId: "pg1" }), {
      params: paramsPromise,
    });
    expect(res.status).toBe(200);
    expect(mockGameUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { playgroupId: "pg1" } })
    );
  });

  it("unassigns a playgroup with null", async () => {
    const { PATCH } = await getHandlers();
    mockIsAdmin.mockResolvedValue(true);
    mockGameFindUnique.mockResolvedValue({ id: "game-1" });
    mockGameUpdate.mockResolvedValue({ id: "game-1", playgroupId: null });
    const res = await PATCH(makeRequest("PATCH", { playgroupId: null }), {
      params: paramsPromise,
    });
    expect(res.status).toBe(200);
    expect(mockGameUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { playgroupId: null } })
    );
  });
});

describe("GET /api/admin/games (list)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 403 when not admin", async () => {
    mockIsAdmin.mockResolvedValue(false);
    const { GET } = await import("@/app/api/admin/games/route");
    const res = await GET(new Request("http://localhost/api/admin/games"));
    expect(res.status).toBe(403);
  });

  it("returns formatted game list", async () => {
    mockIsAdmin.mockResolvedValue(true);
    mockGameFindMany.mockResolvedValue([
      {
        id: "g1",
        playedAt: new Date("2026-04-25"),
        playgroup: { id: "pg1", name: "MTG4" },
        notes: null,
        players: [
          { user: { id: "u1", name: "Dan" }, deck: { id: "d1", name: "Deck1" }, isWinner: true },
        ],
      },
    ]);
    const { GET } = await import("@/app/api/admin/games/route");
    const res = await GET(new Request("http://localhost/api/admin/games"));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.games).toHaveLength(1);
    expect(data.games[0].playgroupName).toBe("MTG4");
    expect(data.games[0].players[0].userName).toBe("Dan");
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
