import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockGetCurrentUserId = jest.fn();
jest.mock("@/lib/auth-helpers", () => ({
  getCurrentUserId: () => mockGetCurrentUserId(),
}));

const mockUserFindUnique = jest.fn();
const mockUserUpdate = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
      update: (...args: unknown[]) => mockUserUpdate(...args),
    },
  },
}));

function makeRequest(body?: Record<string, unknown>) {
  return new Request("http://localhost/api/theme", {
    method: body ? "PUT" : "GET",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function getHandlers() {
  const mod = await import("@/app/api/theme/route");
  return { GET: mod.GET, PUT: mod.PUT };
}

describe("GET /api/theme", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns default when not authenticated", async () => {
    const { GET } = await getHandlers();
    mockGetCurrentUserId.mockResolvedValue(null);
    const res = await GET();
    const data = await res.json();
    expect(data.theme).toBe("default");
  });

  it("returns user theme", async () => {
    const { GET } = await getHandlers();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockUserFindUnique.mockResolvedValue({ theme: "cyber" });

    const res = await GET();
    const data = await res.json();
    expect(data.theme).toBe("cyber");
  });

  it("returns default when user has no theme set", async () => {
    const { GET } = await getHandlers();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockUserFindUnique.mockResolvedValue(null);

    const res = await GET();
    const data = await res.json();
    expect(data.theme).toBe("default");
  });
});

describe("PUT /api/theme", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    const { PUT } = await getHandlers();
    mockGetCurrentUserId.mockResolvedValue(null);
    const res = await PUT(makeRequest({ theme: "cyber" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid theme", async () => {
    const { PUT } = await getHandlers();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    const res = await PUT(makeRequest({ theme: "invalid-theme" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid theme");
  });

  it("updates theme successfully", async () => {
    const { PUT } = await getHandlers();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockUserUpdate.mockResolvedValue({});

    const res = await PUT(makeRequest({ theme: "flame" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.theme).toBe("flame");
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { theme: "flame" },
    });
  });

  it("accepts all valid themes", async () => {
    const { PUT } = await getHandlers();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockUserUpdate.mockResolvedValue({});

    for (const theme of ["default", "synth", "cyber", "flame", "chris", "phyrexia", "stained-glass", "dungeon", "neon-dynasty", "grixis"]) {
      const res = await PUT(makeRequest({ theme }));
      expect(res.status).toBe(200);
    }
  });
});
