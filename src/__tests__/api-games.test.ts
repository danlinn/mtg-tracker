import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// Mock auth
const mockGetCurrentUserId = jest.fn();
jest.mock("@/lib/auth-helpers", () => ({
  getCurrentUserId: () => mockGetCurrentUserId(),
}));

jest.mock("@/lib/playgroup", () => ({
  buildGameWhere: () => Promise.resolve({}),
  getActivePlaygroupId: () => Promise.resolve(null),
}));

// Mock prisma
const mockGameFindMany = jest.fn();
const mockGameCount = jest.fn();
const mockGameCreate = jest.fn();
const mockDeckUpdate = jest.fn();
const mockTransaction = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    game: {
      findMany: (...args: unknown[]) => mockGameFindMany(...args),
      count: (...args: unknown[]) => mockGameCount(...args),
      create: (...args: unknown[]) => mockGameCreate(...args),
    },
    deck: {
      update: (...args: unknown[]) => mockDeckUpdate(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

function makeRequest(body?: Record<string, unknown>) {
  return new Request("http://localhost/api/games", {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function getHandlers() {
  const mod = await import("@/app/api/games/route");
  return { GET: mod.GET, POST: mod.POST };
}

describe("GET /api/games", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    const { GET } = await getHandlers();
    mockGetCurrentUserId.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost/api/games"));
    expect(res.status).toBe(401);
  });

  it("returns paginated games", async () => {
    const { GET } = await getHandlers();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockGameFindMany.mockResolvedValue([]);
    mockGameCount.mockResolvedValue(0);

    const res = await GET(new Request("http://localhost/api/games"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.games).toEqual([]);
    expect(data.total).toBe(0);
    expect(data.page).toBe(1);
    expect(data.perPage).toBe(20);
  });

  it("respects page and perPage params", async () => {
    const { GET } = await getHandlers();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockGameFindMany.mockResolvedValue([]);
    mockGameCount.mockResolvedValue(60);

    const res = await GET(new Request("http://localhost/api/games?page=2&perPage=50"));
    const data = await res.json();
    expect(data.page).toBe(2);
    expect(data.perPage).toBe(50);
    expect(data.totalPages).toBe(2);
  });

  it("queries with correct sort order: playedAt desc, createdAt desc", async () => {
    const { GET } = await getHandlers();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockGameFindMany.mockResolvedValue([]);
    mockGameCount.mockResolvedValue(0);

    await GET(new Request("http://localhost/api/games"));

    expect(mockGameFindMany).toHaveBeenCalledTimes(1);
    const callArgs = mockGameFindMany.mock.calls[0][0] as { orderBy: unknown };
    expect(callArgs.orderBy).toEqual([
      { playedAt: "desc" },
      { createdAt: "desc" },
    ]);
  });
});

describe("POST /api/games", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    const { POST } = await getHandlers();
    mockGetCurrentUserId.mockResolvedValue(null);
    const res = await POST(makeRequest({ players: [] }));
    expect(res.status).toBe(401);
  });

  it("returns 400 with less than 2 players", async () => {
    const { POST } = await getHandlers();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    const res = await POST(
      makeRequest({
        players: [{ userId: "u1", deckId: "d1", isWinner: true }],
      })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Games require 2-4 players");
  });

  it("returns 400 with more than 4 players", async () => {
    const { POST } = await getHandlers();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    const players = Array.from({ length: 5 }, (_, i) => ({
      userId: `u${i}`,
      deckId: `d${i}`,
      isWinner: i === 0,
    }));
    const res = await POST(makeRequest({ players }));
    expect(res.status).toBe(400);
  });

  it("returns 400 with no winner", async () => {
    const { POST } = await getHandlers();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    const res = await POST(
      makeRequest({
        players: [
          { userId: "u1", deckId: "d1", isWinner: false },
          { userId: "u2", deckId: "d2", isWinner: false },
        ],
      })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Exactly one winner required");
  });

  it("returns 400 with multiple winners", async () => {
    const { POST } = await getHandlers();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    const res = await POST(
      makeRequest({
        players: [
          { userId: "u1", deckId: "d1", isWinner: true },
          { userId: "u2", deckId: "d2", isWinner: true },
        ],
      })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Exactly one winner required");
  });

  it("creates game successfully via transaction", async () => {
    const { POST } = await getHandlers();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    const gameResult = {
      id: "g1",
      playedAt: new Date().toISOString(),
      players: [
        {
          userId: "u1",
          deckId: "d1",
          isWinner: true,
          user: { id: "u1", name: "Player 1" },
          deck: { id: "d1", name: "Deck 1", commander: "Commander 1" },
        },
        {
          userId: "u2",
          deckId: "d2",
          isWinner: false,
          user: { id: "u2", name: "Player 2" },
          deck: { id: "d2", name: "Deck 2", commander: "Commander 2" },
        },
      ],
    };
    // $transaction returns array of results; first element is the game
    mockTransaction.mockResolvedValue([gameResult, {}, {}]);

    const res = await POST(
      makeRequest({
        players: [
          { userId: "u1", deckId: "d1", isWinner: true },
          { userId: "u2", deckId: "d2", isWinner: false },
        ],
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe("g1");
    expect(data.players).toHaveLength(2);
  });

  it("returns 500 when transaction fails", async () => {
    const { POST } = await getHandlers();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockTransaction.mockRejectedValue(new Error("DB connection lost"));

    const res = await POST(
      makeRequest({
        players: [
          { userId: "u1", deckId: "d1", isWinner: true },
          { userId: "u2", deckId: "d2", isWinner: false },
        ],
      })
    );
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Failed to save game");
  });
});
