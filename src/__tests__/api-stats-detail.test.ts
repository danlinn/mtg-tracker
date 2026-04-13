import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockGetCurrentUserId = jest.fn();
jest.mock("@/lib/auth-helpers", () => ({
  getCurrentUserId: () => mockGetCurrentUserId(),
}));

const mockBuildGamePlayerWhere = jest.fn();
jest.mock("@/lib/playgroup", () => ({
  buildGamePlayerWhere: (...args: unknown[]) => mockBuildGamePlayerWhere(...args),
}));

const mockUserFindUnique = jest.fn();
const mockGamePlayerFindMany = jest.fn();
const mockDeckFindMany = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
    gamePlayer: {
      findMany: (...args: unknown[]) => mockGamePlayerFindMany(...args),
    },
    deck: {
      findMany: (...args: unknown[]) => mockDeckFindMany(...args),
    },
  },
}));

async function getHandler() {
  const mod = await import("@/app/api/players/[id]/stats-detail/route");
  return mod.GET;
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function gp({
  isWinner,
  deckId = "d1",
  deckName = "Deck",
  commander = "Commander",
  colors = { W: false, U: false, B: false, R: false, G: false },
  playedAt = new Date("2025-01-01"),
  playerCount = 2,
  winnerBracket = null as number | null,
  loserBracket = null as number | null,
}) {
  const players = [
    { id: "p1", isWinner: true, userId: "u1", deck: { bracket: winnerBracket, edhp: null, ...colors, colorW: colors.W, colorU: colors.U, colorB: colors.B, colorR: colors.R, colorG: colors.G } },
  ];
  for (let i = 1; i < playerCount; i++) {
    players.push({ id: `p${i + 1}`, isWinner: false, userId: `u${i + 1}`, deck: { bracket: loserBracket, edhp: null, colorW: false, colorU: false, colorB: false, colorR: false, colorG: false } });
  }
  return {
    isWinner,
    deckId,
    deck: {
      id: deckId,
      name: deckName,
      commander,
      colorW: colors.W,
      colorU: colors.U,
      colorB: colors.B,
      colorR: colors.R,
      colorG: colors.G,
    },
    game: {
      id: "g1",
      playedAt,
      players,
    },
  };
}

describe("GET /api/players/[id]/stats-detail", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBuildGamePlayerWhere.mockResolvedValue({});
  });

  it("returns 401 when not authenticated", async () => {
    mockGetCurrentUserId.mockResolvedValue(null);
    const GET = await getHandler();
    const res = await GET(new Request("http://localhost"), makeParams("u1"));
    expect(res.status).toBe(401);
  });

  it("returns 404 when player not found", async () => {
    mockGetCurrentUserId.mockResolvedValue("viewer-1");
    mockUserFindUnique.mockResolvedValue(null);
    const GET = await getHandler();
    const res = await GET(new Request("http://localhost"), makeParams("missing"));
    expect(res.status).toBe(404);
  });

  it("returns user, games, and decks", async () => {
    mockGetCurrentUserId.mockResolvedValue("viewer-1");
    mockUserFindUnique.mockResolvedValue({ id: "u1", name: "Alice" });
    mockGamePlayerFindMany.mockResolvedValue([
      gp({ isWinner: true, colors: { W: false, U: false, B: false, R: true, G: false } }),
      gp({ isWinner: false, colors: { W: false, U: false, B: false, R: true, G: false } }),
    ]);
    mockDeckFindMany.mockResolvedValue([
      { id: "d1", name: "Krenko", commander: "Krenko, Mob Boss", colorW: false, colorU: false, colorB: false, colorR: true, colorG: false },
    ]);

    const GET = await getHandler();
    const res = await GET(new Request("http://localhost"), makeParams("u1"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.name).toBe("Alice");
    expect(data.games).toHaveLength(2);
    expect(data.decks).toHaveLength(1);
    expect(data.games[0].deck.colors.R).toBe(true);
  });

  it("scopes to playgroup via buildGamePlayerWhere", async () => {
    mockGetCurrentUserId.mockResolvedValue("viewer-1");
    mockUserFindUnique.mockResolvedValue({ id: "u1", name: "Alice" });
    mockGamePlayerFindMany.mockResolvedValue([]);
    mockDeckFindMany.mockResolvedValue([]);
    mockBuildGamePlayerWhere.mockResolvedValue({
      game: { playgroupId: "pg-mtg4" },
    });

    const GET = await getHandler();
    await GET(new Request("http://localhost"), makeParams("u1"));

    // Viewer's userId passed to buildGamePlayerWhere
    expect(mockBuildGamePlayerWhere).toHaveBeenCalledWith("viewer-1");
    // The playgroup filter applied to the gamePlayer query
    expect(mockGamePlayerFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "u1",
          game: { playgroupId: "pg-mtg4" },
        }),
      })
    );
  });

  it("computes winLabel only for winning entries", async () => {
    mockGetCurrentUserId.mockResolvedValue("viewer-1");
    mockUserFindUnique.mockResolvedValue({ id: "u1", name: "Alice" });
    mockGamePlayerFindMany.mockResolvedValue([
      gp({ isWinner: true }),
      gp({ isWinner: false }),
    ]);
    mockDeckFindMany.mockResolvedValue([]);

    const GET = await getHandler();
    const res = await GET(new Request("http://localhost"), makeParams("u1"));
    const data = await res.json();
    // Loss entry should have null winLabel
    expect(data.games[1].winLabel).toBeNull();
  });

  it("orders games chronologically", async () => {
    mockGetCurrentUserId.mockResolvedValue("viewer-1");
    mockUserFindUnique.mockResolvedValue({ id: "u1", name: "Alice" });
    mockGamePlayerFindMany.mockResolvedValue([]);
    mockDeckFindMany.mockResolvedValue([]);

    const GET = await getHandler();
    await GET(new Request("http://localhost"), makeParams("u1"));
    // Verify orderBy playedAt asc
    const callArgs = mockGamePlayerFindMany.mock.calls[0][0] as {
      orderBy: { game: { playedAt: string } };
    };
    expect(callArgs.orderBy).toEqual({ game: { playedAt: "asc" } });
  });
});
