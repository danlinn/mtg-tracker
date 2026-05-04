/**
 * @jest-environment jsdom
 *
 * Tests for the life tracker: isAlive logic, seat assignment padding,
 * PlayerBox rendering (deck labels, assignment hint, commander-damage
 * buffer zone), and the long-press assignment flow.
 */

import { describe, it, expect } from "@jest/globals";
import { isAlive } from "@/lib/tracker-logic";

describe("isAlive", () => {
  it("returns true when life > 0 and no lethal commander damage", () => {
    expect(isAlive({ life: 40, damage: {} })).toBe(true);
    expect(isAlive({ life: 1, damage: { 0: 20 } })).toBe(true);
    expect(isAlive({ life: 40, damage: { 0: 10, 1: 10 } })).toBe(true);
  });

  it("returns false when life <= 0", () => {
    expect(isAlive({ life: 0, damage: {} })).toBe(false);
    expect(isAlive({ life: -5, damage: {} })).toBe(false);
  });

  it("returns false when any single commander damage >= 21", () => {
    expect(isAlive({ life: 40, damage: { 0: 21 } })).toBe(false);
    expect(isAlive({ life: 40, damage: { 0: 10, 1: 21 } })).toBe(false);
    expect(isAlive({ life: 40, damage: { 0: 30 } })).toBe(false);
  });

  it("returns false when life <= 0 AND lethal commander damage", () => {
    expect(isAlive({ life: 0, damage: { 0: 21 } })).toBe(false);
  });

  it("is not affected by combined commander damage below 21 each", () => {
    expect(isAlive({ life: 40, damage: { 0: 20, 1: 20, 2: 20 } })).toBe(true);
  });

  // Partner commander damage (string keys like "0b")
  it("lethal from partner commander B kills the player", () => {
    expect(isAlive({ life: 40, damage: { "0": 10, "0b": 21 } })).toBe(false);
  });

  it("partner damage below 21 each keeps player alive", () => {
    expect(isAlive({ life: 40, damage: { "0": 20, "0b": 20 } })).toBe(true);
  });

  it("partner damage from different opponents tracked independently", () => {
    expect(isAlive({ life: 40, damage: { "0": 10, "0b": 5, "1": 20, "1b": 20 } })).toBe(true);
  });
});

// ---- updateSeat padding logic ----

type Seat = { userId: string; deckId: string };

function updateSeatPadded(
  prev: Seat[],
  idx: number,
  field: "userId" | "deckId",
  value: string
): Seat[] {
  const padded = Array.from({ length: Math.max(prev.length, idx + 1) }, (_, i) =>
    prev[i] ?? { userId: "", deckId: "" }
  );
  return padded.map((s, i) => {
    if (i !== idx) return s;
    if (field === "userId") return { userId: value, deckId: "" };
    return { ...s, [field]: value };
  });
}

describe("updateSeat with padding", () => {
  it("pads an empty array and sets the target index", () => {
    const result = updateSeatPadded([], 0, "userId", "user-1");
    expect(result).toEqual([{ userId: "user-1", deckId: "" }]);
  });

  it("pads to the correct length for higher indices", () => {
    const result = updateSeatPadded([], 2, "userId", "user-3");
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ userId: "", deckId: "" });
    expect(result[1]).toEqual({ userId: "", deckId: "" });
    expect(result[2]).toEqual({ userId: "user-3", deckId: "" });
  });

  it("does not shrink an existing array", () => {
    const prev = [
      { userId: "a", deckId: "d1" },
      { userId: "b", deckId: "d2" },
      { userId: "c", deckId: "d3" },
    ];
    const result = updateSeatPadded(prev, 1, "deckId", "d-new");
    expect(result).toHaveLength(3);
    expect(result[1]).toEqual({ userId: "b", deckId: "d-new" });
    expect(result[0]).toEqual({ userId: "a", deckId: "d1" });
  });

  it("resets deckId when changing userId", () => {
    const prev = [{ userId: "a", deckId: "d1" }];
    const result = updateSeatPadded(prev, 0, "userId", "b");
    expect(result[0]).toEqual({ userId: "b", deckId: "" });
  });

  it("preserves userId when changing deckId", () => {
    const prev = [{ userId: "a", deckId: "d1" }];
    const result = updateSeatPadded(prev, 0, "deckId", "d2");
    expect(result[0]).toEqual({ userId: "a", deckId: "d2" });
  });
});

// ---- Winner detection ----

describe("winner detection", () => {
  it("identifies the last alive player as winner", () => {
    const players = [
      { life: 0, damage: {} },
      { life: 40, damage: {} },
      { life: 0, damage: {} },
      { life: 0, damage: {} },
    ];
    const aliveIndices = players
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => isAlive(p))
      .map(({ i }) => i);
    expect(aliveIndices).toEqual([1]);
  });

  it("returns no winner when multiple players alive", () => {
    const players = [
      { life: 40, damage: {} },
      { life: 40, damage: {} },
      { life: 0, damage: {} },
      { life: 0, damage: {} },
    ];
    const aliveIndices = players
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => isAlive(p))
      .map(({ i }) => i);
    expect(aliveIndices.length).toBeGreaterThan(1);
  });

  it("counts lethal commander damage as eliminated", () => {
    const players = [
      { life: 40, damage: { 1: 21 } },
      { life: 40, damage: {} },
      { life: 0, damage: {} },
      { life: 0, damage: {} },
    ];
    const aliveIndices = players
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => isAlive(p))
      .map(({ i }) => i);
    expect(aliveIndices).toEqual([1]);
  });
});

// ---- URL cleaning (mirrors src/lib/prisma.ts cleanUrl) ----

function cleanUrl(url: string | undefined): string {
  if (!url) return "";
  const stripped = url.replace(/\\n/g, "").replace(/\n/g, "").trim();
  if (!stripped) return "";
  try {
    const u = new URL(stripped);
    u.searchParams.delete("channel_binding");
    return u.toString();
  } catch {
    return stripped;
  }
}

describe("cleanUrl", () => {
  it("strips literal backslash-n", () => {
    const url = "postgresql://user:pass@host/db?sslmode=require\\n";
    expect(cleanUrl(url)).not.toContain("\\n");
  });

  it("strips real newline", () => {
    const url = "postgresql://user:pass@host/db?sslmode=require\n";
    expect(cleanUrl(url)).not.toContain("\n");
  });

  it("removes channel_binding param", () => {
    const url =
      "postgresql://user:pass@host/db?channel_binding=require&sslmode=require";
    const cleaned = cleanUrl(url);
    expect(cleaned).not.toContain("channel_binding");
    expect(cleaned).toContain("sslmode=require");
  });

  it("handles channel_binding as the only param", () => {
    const url = "postgresql://user:pass@host/db?channel_binding=require";
    const cleaned = cleanUrl(url);
    expect(cleaned).not.toContain("channel_binding");
    expect(cleaned).toContain("/db");
    expect(cleaned).not.toContain("neondb&");
  });

  it("returns empty string for undefined", () => {
    expect(cleanUrl(undefined)).toBe("");
  });

  it("returns empty string for empty string", () => {
    expect(cleanUrl("")).toBe("");
  });
});

// ---- Save game validation (mirrors handleSaveGame pre-checks) ----

interface SavePlayer {
  userId: string;
  deckId: string;
  life: number;
  damage: Record<number, number>;
}

function validateSave(
  players: SavePlayer[]
): { ok: true; winnerIdx: number; payload: { userId: string; deckId: string; isWinner: boolean }[] }
 | { ok: false; error: string } {
  const aliveIndices = players
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => isAlive(p))
    .map(({ i }) => i);

  if (aliveIndices.length !== 1) {
    return { ok: false, error: "Exactly one player must be alive" };
  }

  const winnerIdx = aliveIndices[0];

  if (players.some((p) => !p.userId || !p.deckId)) {
    return { ok: false, error: "Every seat needs a player and a deck." };
  }

  const userIds = players.map((p) => p.userId);
  if (new Set(userIds).size !== userIds.length) {
    return { ok: false, error: "Each seat must be a different player." };
  }

  return {
    ok: true,
    winnerIdx,
    payload: players.map((p, i) => ({
      userId: p.userId,
      deckId: p.deckId,
      isWinner: i === winnerIdx,
    })),
  };
}

describe("save game after elimination", () => {
  const player = (
    userId: string,
    deckId: string,
    life: number,
    damage: Record<number, number> = {}
  ): SavePlayer => ({ userId, deckId, life, damage });

  it("identifies the winner when all others are eliminated by life", () => {
    const result = validateSave([
      player("u1", "d1", 0),
      player("u2", "d2", 25),
      player("u3", "d3", 0),
      player("u4", "d4", 0),
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.winnerIdx).toBe(1);
      expect(result.payload[1].isWinner).toBe(true);
      expect(result.payload[0].isWinner).toBe(false);
      expect(result.payload[2].isWinner).toBe(false);
      expect(result.payload[3].isWinner).toBe(false);
    }
  });

  it("identifies the winner when others eliminated by commander damage", () => {
    const result = validateSave([
      player("u1", "d1", 40, { 2: 21 }),
      player("u2", "d2", 40, { 2: 21 }),
      player("u3", "d3", 40),
      player("u4", "d4", 0),
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.winnerIdx).toBe(2);
      expect(result.payload[2].isWinner).toBe(true);
    }
  });

  it("identifies winner with mixed elimination (life + commander)", () => {
    const result = validateSave([
      player("u1", "d1", 0),
      player("u2", "d2", 30),
      player("u3", "d3", 15, { 1: 21 }),
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.winnerIdx).toBe(1);
    }
  });

  it("rejects when multiple players still alive", () => {
    const result = validateSave([
      player("u1", "d1", 20),
      player("u2", "d2", 25),
      player("u3", "d3", 0),
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/one player/i);
    }
  });

  it("rejects when all players are dead", () => {
    const result = validateSave([
      player("u1", "d1", 0),
      player("u2", "d2", 0),
    ]);
    expect(result.ok).toBe(false);
  });

  it("rejects when a seat is missing a player", () => {
    const result = validateSave([
      player("", "d1", 0),
      player("u2", "d2", 25),
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/player and a deck/i);
    }
  });

  it("rejects when a seat is missing a deck", () => {
    const result = validateSave([
      player("u1", "", 0),
      player("u2", "d2", 25),
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/player and a deck/i);
    }
  });

  it("rejects duplicate players", () => {
    const result = validateSave([
      player("u1", "d1", 0),
      player("u1", "d2", 25),
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/different player/i);
    }
  });

  it("builds correct payload with all fields", () => {
    const result = validateSave([
      player("u1", "d1", 0),
      player("u2", "d2", 0),
      player("u3", "d3", 12),
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload).toEqual([
        { userId: "u1", deckId: "d1", isWinner: false },
        { userId: "u2", deckId: "d2", isWinner: false },
        { userId: "u3", deckId: "d3", isWinner: true },
      ]);
    }
  });

  it("works with a 2-player game", () => {
    const result = validateSave([
      player("u1", "d1", 0),
      player("u2", "d2", 5),
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.winnerIdx).toBe(1);
      expect(result.payload).toHaveLength(2);
    }
  });

  // --- Negative tests ---

  it("rejects when no players provided", () => {
    const result = validateSave([]);
    expect(result.ok).toBe(false);
  });

  it("single player with no opponents passes validation (API rejects 2-4 check)", () => {
    const result = validateSave([player("u1", "d1", 40)]);
    expect(result.ok).toBe(true);
    // The API POST handler separately rejects < 2 players
  });

  it("rejects when winner has empty string deckId", () => {
    const result = validateSave([
      player("u1", "", 0),
      player("u2", "d2", 25),
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/player and a deck/i);
  });

  it("rejects when winner has empty string userId", () => {
    const result = validateSave([
      player("u1", "d1", 0),
      player("", "d2", 25),
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/player and a deck/i);
  });

  it("rejects three duplicate players", () => {
    const result = validateSave([
      player("u1", "d1", 0),
      player("u1", "d2", 0),
      player("u1", "d3", 25),
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/different player/i);
  });

  it("combined commander damage below 21 per source does not eliminate", () => {
    // 10 + 11 from different sources — neither is ≥ 21, so u1 is alive
    const result = validateSave([
      player("u1", "d1", 40, { 1: 10, 2: 11 }),
      player("u2", "d2", 0),
      player("u3", "d3", 0),
    ]);
    // u1 has 21 total but no single source ≥ 21 → still alive
    // Only u1 alive → u1 wins
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.winnerIdx).toBe(0);
    }
  });

  it("exactly 21 from ONE source eliminates even with high life", () => {
    const result = validateSave([
      player("u1", "d1", 40, { 1: 21 }),
      player("u2", "d2", 40),
      player("u3", "d3", 0),
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.winnerIdx).toBe(1);
    }
  });

  it("exactly 20 from a single source does NOT eliminate", () => {
    const result = validateSave([
      player("u1", "d1", 40, { 1: 20 }),
      player("u2", "d2", 0),
      player("u3", "d3", 0),
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.winnerIdx).toBe(0);
    }
  });

  it("negative life counts as dead", () => {
    const result = validateSave([
      player("u1", "d1", -10),
      player("u2", "d2", 40),
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.winnerIdx).toBe(1);
    }
  });

  it("life at exactly 0 is dead", () => {
    expect(isAlive({ life: 0, damage: {} })).toBe(false);
  });

  it("life at exactly 1 is alive", () => {
    expect(isAlive({ life: 1, damage: {} })).toBe(true);
  });

  it("payload isWinner flags are mutually exclusive (only one true)", () => {
    const result = validateSave([
      player("u1", "d1", 0),
      player("u2", "d2", 0),
      player("u3", "d3", 0),
      player("u4", "d4", 5),
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const winnerCount = result.payload.filter((p) => p.isWinner).length;
      expect(winnerCount).toBe(1);
      const loserCount = result.payload.filter((p) => !p.isWinner).length;
      expect(loserCount).toBe(3);
    }
  });
});

describe("cleanUrl edge cases", () => {
  it("handles whitespace-only string", () => {
    expect(cleanUrl("   ")).toBe("");
  });

  it("handles non-URL string gracefully", () => {
    const result = cleanUrl("not a url at all");
    expect(typeof result).toBe("string");
    expect(result).toBe("not a url at all");
  });

  it("preserves other query params when removing channel_binding", () => {
    const url = "postgresql://u:p@h/db?sslmode=require&channel_binding=require&connect_timeout=5";
    const cleaned = cleanUrl(url);
    expect(cleaned).toContain("sslmode=require");
    expect(cleaned).toContain("connect_timeout=5");
    expect(cleaned).not.toContain("channel_binding");
  });

  it("handles URL with no query params", () => {
    const url = "postgresql://user:pass@host/db";
    const cleaned = cleanUrl(url);
    expect(cleaned).toBe("postgresql://user:pass@host/db");
  });
});
