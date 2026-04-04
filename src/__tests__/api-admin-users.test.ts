import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockFindMany = jest.fn();
const mockFindUnique = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockIsAdmin = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
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
  const mod = await import("@/app/api/admin/users/route");
  return mod.GET;
}

async function getUserHandler() {
  const mod = await import("@/app/api/admin/users/[id]/route");
  return { PUT: mod.PUT, DELETE: mod.DELETE };
}

describe("Admin Users API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/admin/users", () => {
    it("returns 403 for non-admins", async () => {
      mockIsAdmin.mockResolvedValue(false);
      const GET = await getListHandler();
      const res = await GET();
      expect(res.status).toBe(403);
    });

    it("returns users for admins", async () => {
      mockIsAdmin.mockResolvedValue(true);
      mockFindMany.mockResolvedValue([
        { id: "1", name: "User", email: "u@test.com", role: "user", _count: { decks: 2, gameEntries: 5 } },
      ]);
      const GET = await getListHandler();
      const res = await GET();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe("User");
    });
  });

  describe("PUT /api/admin/users/[id]", () => {
    it("returns 403 for non-admins", async () => {
      mockIsAdmin.mockResolvedValue(false);
      const { PUT } = await getUserHandler();
      const req = new Request("http://localhost/api/admin/users/1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated" }),
      });
      const res = await PUT(req, { params: Promise.resolve({ id: "1" }) });
      expect(res.status).toBe(403);
    });

    it("returns 404 for missing user", async () => {
      mockIsAdmin.mockResolvedValue(true);
      mockFindUnique.mockResolvedValue(null);
      const { PUT } = await getUserHandler();
      const req = new Request("http://localhost/api/admin/users/1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated" }),
      });
      const res = await PUT(req, { params: Promise.resolve({ id: "1" }) });
      expect(res.status).toBe(404);
    });

    it("updates user for admin", async () => {
      mockIsAdmin.mockResolvedValue(true);
      mockFindUnique.mockResolvedValue({ id: "1", name: "Old", email: "old@test.com", role: "user" });
      mockUpdate.mockResolvedValue({ id: "1", name: "New", email: "old@test.com", role: "user" });
      const { PUT } = await getUserHandler();
      const req = new Request("http://localhost/api/admin/users/1", {
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

  describe("DELETE /api/admin/users/[id]", () => {
    it("returns 403 for non-admins", async () => {
      mockIsAdmin.mockResolvedValue(false);
      const { DELETE } = await getUserHandler();
      const req = new Request("http://localhost/api/admin/users/1", { method: "DELETE" });
      const res = await DELETE(req, { params: Promise.resolve({ id: "1" }) });
      expect(res.status).toBe(403);
    });

    it("deletes user for admin", async () => {
      mockIsAdmin.mockResolvedValue(true);
      mockFindUnique.mockResolvedValue({ id: "1" });
      mockDelete.mockResolvedValue({});
      const { DELETE } = await getUserHandler();
      const req = new Request("http://localhost/api/admin/users/1", { method: "DELETE" });
      const res = await DELETE(req, { params: Promise.resolve({ id: "1" }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });
  });
});
