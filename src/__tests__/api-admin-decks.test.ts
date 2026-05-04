import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockFindMany = jest.fn();
const mockFindUnique = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockIsAdmin = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    deck: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
    },
  },
}));

jest.mock("@/lib/auth-helpers", () => ({
  isAdmin: () => mockIsAdmin(),
}));

async function getListHandler() {
  const mod = await import("@/app/api/admin/decks/route");
  return mod.GET;
}

async function getDeckHandler() {
  const mod = await import("@/app/api/admin/decks/[id]/route");
  return { PUT: mod.PUT, DELETE: mod.DELETE };
}

describe("Admin Decks API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/admin/decks", () => {
    it("returns 403 for non-admins", async () => {
      mockIsAdmin.mockResolvedValue(false);
      const GET = await getListHandler();
      const res = await GET();
      expect(res.status).toBe(403);
    });

    it("returns all decks for admins", async () => {
      mockIsAdmin.mockResolvedValue(true);
      mockFindMany.mockResolvedValue([
        { id: "1", name: "Goblins", commander: "Krenko", user: { id: "u1", name: "User1" } },
      ]);
      const GET = await getListHandler();
      const res = await GET();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe("Goblins");
    });
  });

  describe("PUT /api/admin/decks/[id]", () => {
    it("returns 403 for non-admins", async () => {
      mockIsAdmin.mockResolvedValue(false);
      const { PUT } = await getDeckHandler();
      const req = new Request("http://localhost", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated" }),
      });
      const res = await PUT(req, { params: Promise.resolve({ id: "1" }) });
      expect(res.status).toBe(403);
    });

    it("updates deck for admin", async () => {
      mockIsAdmin.mockResolvedValue(true);
      mockFindUnique.mockResolvedValue({ id: "1", name: "Old", commander: "Old Cmdr", colorW: false, colorU: false, colorB: false, colorR: true, colorG: false });
      mockUpdate.mockResolvedValue({ id: "1", name: "New", commander: "Old Cmdr" });
      const { PUT } = await getDeckHandler();
      const req = new Request("http://localhost", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New" }),
      });
      const res = await PUT(req, { params: Promise.resolve({ id: "1" }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.name).toBe("New");
    });
  });

  describe("DELETE /api/admin/decks/[id]", () => {
    it("returns 403 for non-admins", async () => {
      mockIsAdmin.mockResolvedValue(false);
      const { DELETE } = await getDeckHandler();
      const req = new Request("http://localhost", { method: "DELETE" });
      const res = await DELETE(req, { params: Promise.resolve({ id: "1" }) });
      expect(res.status).toBe(403);
    });

    it("deletes deck for admin", async () => {
      mockIsAdmin.mockResolvedValue(true);
      mockFindUnique.mockResolvedValue({ id: "1" });
      mockDelete.mockResolvedValue({});
      const { DELETE } = await getDeckHandler();
      const req = new Request("http://localhost", { method: "DELETE" });
      const res = await DELETE(req, { params: Promise.resolve({ id: "1" }) });
      expect(res.status).toBe(200);
    });

    it("returns 404 when deck not found for delete", async () => {
      mockIsAdmin.mockResolvedValue(true);
      mockFindUnique.mockResolvedValue(null);
      const { DELETE } = await getDeckHandler();
      const req = new Request("http://localhost", { method: "DELETE" });
      const res = await DELETE(req, { params: Promise.resolve({ id: "999" }) });
      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/admin/decks/[id] — negative cases", () => {
    it("returns 404 when deck not found for update", async () => {
      mockIsAdmin.mockResolvedValue(true);
      mockFindUnique.mockResolvedValue(null);
      const { PUT } = await getDeckHandler();
      const req = new Request("http://localhost", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated" }),
      });
      const res = await PUT(req, { params: Promise.resolve({ id: "999" }) });
      expect(res.status).toBe(404);
    });
  });
});
