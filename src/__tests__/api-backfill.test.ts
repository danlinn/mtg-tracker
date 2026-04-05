import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockIsAdmin = jest.fn();
jest.mock("@/lib/auth-helpers", () => ({
  isAdmin: () => mockIsAdmin(),
}));

const mockDeckFindMany = jest.fn();
const mockDeckUpdate = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    deck: {
      findMany: (...args: unknown[]) => mockDeckFindMany(...args),
      update: (...args: unknown[]) => mockDeckUpdate(...args),
    },
  },
}));

async function getHandler() {
  const mod = await import("@/app/api/admin/backfill-last-played/route");
  return mod.POST;
}

describe("POST /api/admin/backfill-last-played", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 403 when not admin", async () => {
    const POST = await getHandler();
    mockIsAdmin.mockResolvedValue(false);
    const res = await POST();
    expect(res.status).toBe(403);
  });

  it("returns empty when no decks need backfilling", async () => {
    const POST = await getHandler();
    mockIsAdmin.mockResolvedValue(true);
    mockDeckFindMany.mockResolvedValue([]);

    const res = await POST();
    const data = await res.json();
    expect(data.message).toContain("0 deck(s)");
    expect(data.decks).toEqual([]);
  });

  it("backfills decks with missing lastPlayedAt", async () => {
    const POST = await getHandler();
    mockIsAdmin.mockResolvedValue(true);
    mockDeckFindMany.mockResolvedValue([
      {
        id: "d1",
        name: "Deck One",
        gameEntries: [{ game: { playedAt: new Date("2025-06-15") } }],
      },
      {
        id: "d2",
        name: "Deck Two",
        gameEntries: [{ game: { playedAt: new Date("2025-03-01") } }],
      },
    ]);
    mockDeckUpdate.mockResolvedValue({});

    const res = await POST();
    const data = await res.json();
    expect(data.message).toContain("2 deck(s)");
    expect(data.decks).toEqual(["Deck One", "Deck Two"]);
    expect(mockDeckUpdate).toHaveBeenCalledTimes(2);
  });

  it("skips decks with empty game entries", async () => {
    const POST = await getHandler();
    mockIsAdmin.mockResolvedValue(true);
    mockDeckFindMany.mockResolvedValue([
      { id: "d1", name: "Empty", gameEntries: [] },
    ]);

    const res = await POST();
    const data = await res.json();
    expect(data.decks).toEqual([]);
    expect(mockDeckUpdate).not.toHaveBeenCalled();
  });
});
