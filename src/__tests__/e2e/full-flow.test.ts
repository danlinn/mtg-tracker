import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import {
  cleanDatabase,
  registerUser,
  loginAndGetCookie,
  apiRequest,
} from "./helpers";

let cookieA: string;
let cookieB: string;
let userA: { id: string; email: string; name: string };
let userB: { id: string; email: string; name: string };
let deckA1: { id: string };
let deckA2: { id: string };
let deckB1: { id: string };

describe("E2E: Full application flow", () => {
  beforeAll(async () => {
    await cleanDatabase();
  }, 15000);

  afterAll(async () => {
    await cleanDatabase();
  }, 15000);

  // ---- REGISTRATION ----

  describe("Registration", () => {
    it("registers user A", async () => {
      userA = await registerUser("Alice", "alice@test.com", "password123");
      expect(userA.id).toBeDefined();
      expect(userA.name).toBe("Alice");
      expect(userA.email).toBe("alice@test.com");
    });

    it("registers user B", async () => {
      userB = await registerUser("Bob", "bob@test.com", "password456");
      expect(userB.id).toBeDefined();
      expect(userB.name).toBe("Bob");
    });

    it("rejects duplicate email", async () => {
      const res = await apiRequest("/api/register", {
        method: "POST",
        body: { name: "Alice2", email: "alice@test.com", password: "pass" },
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Email already registered");
    });

    it("rejects missing fields", async () => {
      const res = await apiRequest("/api/register", {
        method: "POST",
        body: { email: "nope@test.com" },
      });
      expect(res.status).toBe(400);
    });
  });

  // ---- AUTHENTICATION ----

  describe("Authentication", () => {
    it("logs in user A and gets session cookie", async () => {
      cookieA = await loginAndGetCookie("alice@test.com", "password123");
      expect(cookieA).toContain("next-auth.session-token");
    });

    it("logs in user B and gets session cookie", async () => {
      cookieB = await loginAndGetCookie("bob@test.com", "password456");
      expect(cookieB).toContain("next-auth.session-token");
    });

    it("rejects unauthenticated API access", async () => {
      const res = await apiRequest("/api/decks");
      expect(res.status).toBe(401);
    });
  });

  // ---- DECK CRUD ----

  describe("Deck management", () => {
    it("user A creates a deck", async () => {
      const res = await apiRequest("/api/decks", {
        method: "POST",
        body: {
          name: "Krenko Goblins",
          commander: "Krenko, Mob Boss",
          colors: { R: true },
        },
        cookie: cookieA,
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.name).toBe("Krenko Goblins");
      expect(data.commander).toBe("Krenko, Mob Boss");
      expect(data.colorR).toBe(true);
      expect(data.colorU).toBe(false);
      deckA1 = data;
    });

    it("user A creates a second deck", async () => {
      const res = await apiRequest("/api/decks", {
        method: "POST",
        body: {
          name: "Atraxa Superfriends",
          commander: "Atraxa, Praetors' Voice",
          colors: { W: true, U: true, B: true, G: true },
        },
        cookie: cookieA,
      });
      expect(res.status).toBe(200);
      deckA2 = await res.json();
    });

    it("user B creates a deck", async () => {
      const res = await apiRequest("/api/decks", {
        method: "POST",
        body: {
          name: "Muldrotha Value",
          commander: "Muldrotha, the Gravetide",
          colors: { U: true, B: true, G: true },
        },
        cookie: cookieB,
      });
      expect(res.status).toBe(200);
      deckB1 = await res.json();
    });

    it("user A lists only their decks", async () => {
      const res = await apiRequest("/api/decks", { cookie: cookieA });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveLength(2);
      expect(data.map((d: { name: string }) => d.name)).toContain("Krenko Goblins");
      expect(data.map((d: { name: string }) => d.name)).toContain("Atraxa Superfriends");
    });

    it("user B lists only their decks", async () => {
      const res = await apiRequest("/api/decks", { cookie: cookieB });
      const data = await res.json();
      expect(data).toHaveLength(1);
    });

    it("rejects creating a deck without name", async () => {
      const res = await apiRequest("/api/decks", {
        method: "POST",
        body: { commander: "Test" },
        cookie: cookieA,
      });
      expect(res.status).toBe(400);
    });

    it("user A can update their deck", async () => {
      const res = await apiRequest(`/api/decks/${deckA1.id}`, {
        method: "PUT",
        body: { name: "Krenko Aggro" },
        cookie: cookieA,
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.name).toBe("Krenko Aggro");
      expect(data.commander).toBe("Krenko, Mob Boss"); // unchanged
    });

    it("user B cannot update user A's deck", async () => {
      const res = await apiRequest(`/api/decks/${deckA1.id}`, {
        method: "PUT",
        body: { name: "Hacked" },
        cookie: cookieB,
      });
      expect(res.status).toBe(404);
    });

    it("user B cannot delete user A's deck", async () => {
      const res = await apiRequest(`/api/decks/${deckA1.id}`, {
        method: "DELETE",
        cookie: cookieB,
      });
      expect(res.status).toBe(404);
    });
  });

  // ---- USERS LIST ----

  describe("Users list", () => {
    it("returns all users with their decks", async () => {
      const res = await apiRequest("/api/users", { cookie: cookieA });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.length).toBeGreaterThanOrEqual(2);
      const alice = data.find((u: { name: string }) => u.name === "Alice");
      expect(alice.decks.length).toBe(2);
    });
  });

  // ---- GAME LOGGING ----

  describe("Game logging", () => {
    it("rejects game with fewer than 2 players", async () => {
      const res = await apiRequest("/api/games", {
        method: "POST",
        body: {
          players: [
            { userId: userA.id, deckId: deckA1.id, isWinner: true },
          ],
        },
        cookie: cookieA,
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Games require 2-4 players");
    });

    it("rejects game with no winner", async () => {
      const res = await apiRequest("/api/games", {
        method: "POST",
        body: {
          players: [
            { userId: userA.id, deckId: deckA1.id, isWinner: false },
            { userId: userB.id, deckId: deckB1.id, isWinner: false },
          ],
        },
        cookie: cookieA,
      });
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe("Exactly one winner required");
    });

    it("rejects game with multiple winners", async () => {
      const res = await apiRequest("/api/games", {
        method: "POST",
        body: {
          players: [
            { userId: userA.id, deckId: deckA1.id, isWinner: true },
            { userId: userB.id, deckId: deckB1.id, isWinner: true },
          ],
        },
        cookie: cookieA,
      });
      expect(res.status).toBe(400);
    });

    it("logs a game where user A wins", async () => {
      const res = await apiRequest("/api/games", {
        method: "POST",
        body: {
          players: [
            { userId: userA.id, deckId: deckA1.id, isWinner: true },
            { userId: userB.id, deckId: deckB1.id, isWinner: false },
          ],
        },
        cookie: cookieA,
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.id).toBeDefined();
      expect(data.players).toHaveLength(2);
      const winner = data.players.find(
        (p: { isWinner: boolean }) => p.isWinner
      );
      expect(winner.user.name).toBe("Alice");
    });

    it("logs a game where user B wins", async () => {
      const res = await apiRequest("/api/games", {
        method: "POST",
        body: {
          players: [
            { userId: userA.id, deckId: deckA2.id, isWinner: false },
            { userId: userB.id, deckId: deckB1.id, isWinner: true },
          ],
        },
        cookie: cookieA,
      });
      expect(res.status).toBe(200);
    });

    it("logs a third game where user A wins", async () => {
      const res = await apiRequest("/api/games", {
        method: "POST",
        body: {
          players: [
            { userId: userA.id, deckId: deckA1.id, isWinner: true },
            { userId: userB.id, deckId: deckB1.id, isWinner: false },
          ],
        },
        cookie: cookieA,
      });
      expect(res.status).toBe(200);
    });

    it("user A sees their games", async () => {
      const res = await apiRequest("/api/games", { cookie: cookieA });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveLength(3);
    });

    it("user B sees their games", async () => {
      const res = await apiRequest("/api/games", { cookie: cookieB });
      const data = await res.json();
      expect(data).toHaveLength(3);
    });
  });

  // ---- STATS ----

  describe("Stats", () => {
    it("shows correct stats for user A (2 wins, 1 loss)", async () => {
      const res = await apiRequest("/api/stats", { cookie: cookieA });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.totalGames).toBe(3);
      expect(data.wins).toBe(2);
      expect(data.losses).toBe(1);
      expect(data.winRate).toBe(67);
      expect(data.deckStats.length).toBe(2);

      const krenkoStats = data.deckStats.find(
        (d: { commander: string }) => d.commander === "Krenko, Mob Boss"
      );
      expect(krenkoStats.games).toBe(2);
      expect(krenkoStats.wins).toBe(2);
      expect(krenkoStats.winRate).toBe(100);
    });

    it("shows correct stats for user B (1 win, 2 losses)", async () => {
      const res = await apiRequest("/api/stats", { cookie: cookieB });
      const data = await res.json();
      expect(data.totalGames).toBe(3);
      expect(data.wins).toBe(1);
      expect(data.losses).toBe(2);
      expect(data.winRate).toBe(33);
    });
  });

  // ---- LEADERBOARD ----

  describe("Leaderboard", () => {
    it("shows Alice first (more wins)", async () => {
      const res = await apiRequest("/api/leaderboard", { cookie: cookieA });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveLength(2);
      expect(data[0].name).toBe("Alice");
      expect(data[0].wins).toBe(2);
      expect(data[1].name).toBe("Bob");
      expect(data[1].wins).toBe(1);
    });
  });

  // ---- DECK DELETION ----

  describe("Deck deletion", () => {
    it("user A deletes their second deck", async () => {
      const res = await apiRequest(`/api/decks/${deckA2.id}`, {
        method: "DELETE",
        cookie: cookieA,
      });
      expect(res.status).toBe(200);
    });

    it("user A now has 1 deck", async () => {
      const res = await apiRequest("/api/decks", { cookie: cookieA });
      const data = await res.json();
      expect(data).toHaveLength(1);
    });
  });
});
