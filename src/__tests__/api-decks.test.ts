import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// Mock auth
const mockGetCurrentUserId = jest.fn();
jest.mock("@/lib/auth-helpers", () => ({
  getCurrentUserId: () => mockGetCurrentUserId(),
}));

// Mock prisma
const mockFindMany = jest.fn();
const mockDeckCount = jest.fn();
const mockDeckCreate = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    deck: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      count: (...args: unknown[]) => mockDeckCount(...args),
      create: (...args: unknown[]) => mockDeckCreate(...args),
    },
  },
}));

function makeRequest(body?: Record<string, unknown>) {
  return new Request("http://localhost/api/decks", {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function getHandlers() {
  const mod = await import("@/app/api/decks/route");
  return { GET: mod.GET, POST: mod.POST };
}

describe("GET /api/decks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    const { GET } = await getHandlers();
    mockGetCurrentUserId.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost/api/decks"));
    expect(res.status).toBe(401);
  });

  it("returns paginated user decks", async () => {
    const { GET } = await getHandlers();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    const decks = [
      { id: "d1", name: "Krenko", commander: "Krenko, Mob Boss" },
    ];
    mockFindMany.mockResolvedValue(decks);
    mockDeckCount.mockResolvedValue(1);

    const res = await GET(new Request("http://localhost/api/decks"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.decks).toEqual(decks);
    expect(data.total).toBe(1);
    expect(data.page).toBe(1);
    expect(data.perPage).toBe(20);
  });
});

describe("POST /api/decks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    const { POST } = await getHandlers();
    mockGetCurrentUserId.mockResolvedValue(null);
    const res = await POST(makeRequest({ name: "Test", commander: "Test" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when missing name or commander", async () => {
    const { POST } = await getHandlers();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    const res = await POST(makeRequest({ name: "Test" }));
    expect(res.status).toBe(400);
  });

  it("creates deck successfully", async () => {
    const { POST } = await getHandlers();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    const created = {
      id: "d1",
      name: "Krenko",
      commander: "Krenko, Mob Boss",
      colorR: true,
    };
    mockDeckCreate.mockResolvedValue(created);

    const res = await POST(
      makeRequest({
        name: "Krenko",
        commander: "Krenko, Mob Boss",
        colors: { R: true },
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe("Krenko");
  });
});
