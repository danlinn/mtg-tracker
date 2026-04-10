import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockIsAdmin = jest.fn();
jest.mock("@/lib/auth-helpers", () => ({
  isAdmin: () => mockIsAdmin(),
}));

const mockPlaygroupFindUnique = jest.fn();
const mockGameUpdateMany = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    playgroup: {
      findUnique: (...args: unknown[]) => mockPlaygroupFindUnique(...args),
    },
    game: {
      updateMany: (...args: unknown[]) => mockGameUpdateMany(...args),
    },
  },
}));

async function getHandler() {
  const mod = await import("@/app/api/admin/backfill-playgroup/route");
  return mod.POST;
}

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/backfill-playgroup", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 403 when not admin", async () => {
    mockIsAdmin.mockResolvedValue(false);
    const POST = await getHandler();
    const res = await POST(makeRequest({ playgroupId: "pg1" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 when playgroupId missing", async () => {
    mockIsAdmin.mockResolvedValue(true);
    const POST = await getHandler();
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 404 when playgroup not found", async () => {
    mockIsAdmin.mockResolvedValue(true);
    mockPlaygroupFindUnique.mockResolvedValue(null);
    const POST = await getHandler();
    const res = await POST(makeRequest({ playgroupId: "bad" }));
    expect(res.status).toBe(404);
  });

  it("assigns unassigned games to playgroup", async () => {
    mockIsAdmin.mockResolvedValue(true);
    mockPlaygroupFindUnique.mockResolvedValue({ id: "pg1", name: "MTG4" });
    mockGameUpdateMany.mockResolvedValue({ count: 15 });
    const POST = await getHandler();
    const res = await POST(makeRequest({ playgroupId: "pg1" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.gamesAssigned).toBe(15);
    expect(data.message).toContain("MTG4");
  });
});
