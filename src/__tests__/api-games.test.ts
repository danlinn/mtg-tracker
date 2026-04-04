import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// Mock auth
const mockGetCurrentUserId = jest.fn();
jest.mock("@/lib/auth-helpers", () => ({
  getCurrentUserId: () => mockGetCurrentUserId(),
}));

// Mock prisma
const mockGameFindMany = jest.fn();
const mockGameCreate = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    game: {
      findMany: (...args: unknown[]) => mockGameFindMany(...args),
      create: (...args: unknown[]) => mockGameCreate(...args),
    },
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
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns user games", async () => {
    const { GET } = await getHandlers();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockGameFindMany.mockResolvedValue([]);

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual([]);
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

  it("creates game successfully", async () => {
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
    mockGameCreate.mockResolvedValue(gameResult);

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
});
