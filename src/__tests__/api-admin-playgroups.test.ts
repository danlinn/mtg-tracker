import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockIsAdmin = jest.fn();
jest.mock("@/lib/auth-helpers", () => ({
  isAdmin: () => mockIsAdmin(),
  getCurrentUserId: () => Promise.resolve("admin-1"),
}));

const mockPlaygroupFindMany = jest.fn();
const mockPlaygroupCreate = jest.fn();
const mockPlaygroupFindUnique = jest.fn();
const mockPlaygroupUpdate = jest.fn();
const mockPlaygroupDelete = jest.fn();
const mockMemberFindUnique = jest.fn();
const mockMemberCreate = jest.fn();
const mockMemberDeleteMany = jest.fn();
const mockMemberUpdate = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    playgroup: {
      findMany: (...args: unknown[]) => mockPlaygroupFindMany(...args),
      create: (...args: unknown[]) => mockPlaygroupCreate(...args),
      findUnique: (...args: unknown[]) => mockPlaygroupFindUnique(...args),
      update: (...args: unknown[]) => mockPlaygroupUpdate(...args),
      delete: (...args: unknown[]) => mockPlaygroupDelete(...args),
    },
    playgroupMember: {
      findUnique: (...args: unknown[]) => mockMemberFindUnique(...args),
      create: (...args: unknown[]) => mockMemberCreate(...args),
      deleteMany: (...args: unknown[]) => mockMemberDeleteMany(...args),
      update: (...args: unknown[]) => mockMemberUpdate(...args),
    },
  },
}));

describe("GET /api/admin/playgroups", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 403 when not admin", async () => {
    mockIsAdmin.mockResolvedValue(false);
    const { GET } = await import("@/app/api/admin/playgroups/route");
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns playgroups", async () => {
    mockIsAdmin.mockResolvedValue(true);
    const data = [{ id: "pg1", name: "Group 1", _count: { members: 3, games: 5 } }];
    mockPlaygroupFindMany.mockResolvedValue(data);
    const { GET } = await import("@/app/api/admin/playgroups/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(data);
  });
});

describe("POST /api/admin/playgroups", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 403 when not admin", async () => {
    mockIsAdmin.mockResolvedValue(false);
    const { POST } = await import("@/app/api/admin/playgroups/route");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Test" }),
      })
    );
    expect(res.status).toBe(403);
  });

  it("returns 400 when name is missing", async () => {
    mockIsAdmin.mockResolvedValue(true);
    const { POST } = await import("@/app/api/admin/playgroups/route");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(400);
  });

  it("creates playgroup", async () => {
    mockIsAdmin.mockResolvedValue(true);
    mockPlaygroupCreate.mockResolvedValue({ id: "pg1", name: "New Group" });
    const { POST } = await import("@/app/api/admin/playgroups/route");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Group" }),
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.name).toBe("New Group");
  });
});

describe("DELETE /api/admin/playgroups/[id]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 403 when not admin", async () => {
    mockIsAdmin.mockResolvedValue(false);
    const { DELETE } = await import("@/app/api/admin/playgroups/[id]/route");
    const res = await DELETE(
      new Request("http://localhost", { method: "DELETE" }),
      { params: Promise.resolve({ id: "pg1" }) }
    );
    expect(res.status).toBe(403);
  });

  it("returns 404 when not found", async () => {
    mockIsAdmin.mockResolvedValue(true);
    mockPlaygroupFindUnique.mockResolvedValue(null);
    const { DELETE } = await import("@/app/api/admin/playgroups/[id]/route");
    const res = await DELETE(
      new Request("http://localhost", { method: "DELETE" }),
      { params: Promise.resolve({ id: "pg1" }) }
    );
    expect(res.status).toBe(404);
  });

  it("deletes playgroup", async () => {
    mockIsAdmin.mockResolvedValue(true);
    mockPlaygroupFindUnique.mockResolvedValue({ id: "pg1" });
    mockPlaygroupDelete.mockResolvedValue({});
    const { DELETE } = await import("@/app/api/admin/playgroups/[id]/route");
    const res = await DELETE(
      new Request("http://localhost", { method: "DELETE" }),
      { params: Promise.resolve({ id: "pg1" }) }
    );
    expect(res.status).toBe(200);
  });
});

describe("POST /api/admin/playgroups/[id] (member management)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("adds a member", async () => {
    mockIsAdmin.mockResolvedValue(true);
    mockMemberFindUnique.mockResolvedValue(null);
    mockMemberCreate.mockResolvedValue({});
    const { POST } = await import("@/app/api/admin/playgroups/[id]/route");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", userId: "user-1" }),
      }),
      { params: Promise.resolve({ id: "pg1" }) }
    );
    expect(res.status).toBe(200);
  });

  it("removes a member", async () => {
    mockIsAdmin.mockResolvedValue(true);
    mockMemberDeleteMany.mockResolvedValue({});
    const { POST } = await import("@/app/api/admin/playgroups/[id]/route");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", userId: "user-1" }),
      }),
      { params: Promise.resolve({ id: "pg1" }) }
    );
    expect(res.status).toBe(200);
  });

  it("sets playgroup admin role", async () => {
    mockIsAdmin.mockResolvedValue(true);
    mockMemberUpdate.mockResolvedValue({});
    const { POST } = await import("@/app/api/admin/playgroups/[id]/route");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setRole", userId: "user-1", role: "admin" }),
      }),
      { params: Promise.resolve({ id: "pg1" }) }
    );
    expect(res.status).toBe(200);
  });

  it("rejects invalid role", async () => {
    mockIsAdmin.mockResolvedValue(true);
    const { POST } = await import("@/app/api/admin/playgroups/[id]/route");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setRole", userId: "user-1", role: "superadmin" }),
      }),
      { params: Promise.resolve({ id: "pg1" }) }
    );
    expect(res.status).toBe(400);
  });

  it("rejects unknown action", async () => {
    mockIsAdmin.mockResolvedValue(true);
    const { POST } = await import("@/app/api/admin/playgroups/[id]/route");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "destroy", userId: "user-1" }),
      }),
      { params: Promise.resolve({ id: "pg1" }) }
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when missing userId for add", async () => {
    mockIsAdmin.mockResolvedValue(true);
    const { POST } = await import("@/app/api/admin/playgroups/[id]/route");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add" }),
      }),
      { params: Promise.resolve({ id: "pg1" }) }
    );
    expect(res.status).toBe(400);
  });
});
