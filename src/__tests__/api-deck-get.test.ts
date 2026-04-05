import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockFindUnique = jest.fn();
const mockDeckUpdate = jest.fn();
const mockDeckDelete = jest.fn();
const mockGetCurrentUserId = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    deck: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockDeckUpdate(...args),
      delete: (...args: unknown[]) => mockDeckDelete(...args),
    },
  },
}));

jest.mock("@/lib/auth-helpers", () => ({
  getCurrentUserId: () => mockGetCurrentUserId(),
}));

async function getHandlers() {
  const mod = await import("@/app/api/decks/[id]/route");
  return { GET: mod.GET, PUT: mod.PUT, DELETE: mod.DELETE };
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makePutRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/decks/1", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/decks/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetCurrentUserId.mockResolvedValue(null);
    const { GET } = await getHandlers();
    const res = await GET(new Request("http://localhost"), makeParams("1"));
    expect(res.status).toBe(401);
  });

  it("returns 404 when deck not found", async () => {
    mockGetCurrentUserId.mockResolvedValue("user1");
    mockFindUnique.mockResolvedValue(null);
    const { GET } = await getHandlers();
    const res = await GET(new Request("http://localhost"), makeParams("1"));
    expect(res.status).toBe(404);
  });

  it("returns 404 when deck belongs to another user", async () => {
    mockGetCurrentUserId.mockResolvedValue("user1");
    mockFindUnique.mockResolvedValue({ id: "1", userId: "user2", name: "Other" });
    const { GET } = await getHandlers();
    const res = await GET(new Request("http://localhost"), makeParams("1"));
    expect(res.status).toBe(404);
  });

  it("returns deck when owned by current user", async () => {
    mockGetCurrentUserId.mockResolvedValue("user1");
    mockFindUnique.mockResolvedValue({ id: "1", userId: "user1", name: "My Deck", commander: "Krenko" });
    const { GET } = await getHandlers();
    const res = await GET(new Request("http://localhost"), makeParams("1"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe("My Deck");
  });
});

describe("PUT /api/decks/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const existingDeck = {
    id: "1", userId: "user1", name: "Old Name", commander: "C1",
    commanderImage: null, commander2: null, commander2Image: null,
    bracket: 3, edhp: 5.0, decklist: null,
    colorW: false, colorU: true, colorB: false, colorR: false, colorG: false,
  };

  it("returns 401 when not authenticated", async () => {
    mockGetCurrentUserId.mockResolvedValue(null);
    const { PUT } = await getHandlers();
    const res = await PUT(makePutRequest({ name: "New" }), makeParams("1"));
    expect(res.status).toBe(401);
  });

  it("returns 404 when deck not found", async () => {
    mockGetCurrentUserId.mockResolvedValue("user1");
    mockFindUnique.mockResolvedValue(null);
    const { PUT } = await getHandlers();
    const res = await PUT(makePutRequest({ name: "New" }), makeParams("1"));
    expect(res.status).toBe(404);
  });

  it("returns 404 when deck belongs to another user", async () => {
    mockGetCurrentUserId.mockResolvedValue("user1");
    mockFindUnique.mockResolvedValue({ ...existingDeck, userId: "user2" });
    const { PUT } = await getHandlers();
    const res = await PUT(makePutRequest({ name: "Hacked" }), makeParams("1"));
    expect(res.status).toBe(404);
  });

  it("updates deck name successfully", async () => {
    mockGetCurrentUserId.mockResolvedValue("user1");
    mockFindUnique.mockResolvedValue(existingDeck);
    mockDeckUpdate.mockResolvedValue({ ...existingDeck, name: "New Name" });
    const { PUT } = await getHandlers();
    const res = await PUT(makePutRequest({ name: "New Name" }), makeParams("1"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe("New Name");
  });

  it("preserves unchanged fields", async () => {
    mockGetCurrentUserId.mockResolvedValue("user1");
    mockFindUnique.mockResolvedValue(existingDeck);
    mockDeckUpdate.mockResolvedValue(existingDeck);
    const { PUT } = await getHandlers();
    await PUT(makePutRequest({}), makeParams("1"));
    const updateCall = mockDeckUpdate.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(updateCall.data.commander).toBe("C1");
    expect(updateCall.data.bracket).toBe(3);
  });
});

describe("DELETE /api/decks/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetCurrentUserId.mockResolvedValue(null);
    const { DELETE } = await getHandlers();
    const res = await DELETE(new Request("http://localhost"), makeParams("1"));
    expect(res.status).toBe(401);
  });

  it("returns 404 when deck not found", async () => {
    mockGetCurrentUserId.mockResolvedValue("user1");
    mockFindUnique.mockResolvedValue(null);
    const { DELETE } = await getHandlers();
    const res = await DELETE(new Request("http://localhost"), makeParams("1"));
    expect(res.status).toBe(404);
  });

  it("returns 404 when deck belongs to another user", async () => {
    mockGetCurrentUserId.mockResolvedValue("user1");
    mockFindUnique.mockResolvedValue({ id: "1", userId: "user2" });
    const { DELETE } = await getHandlers();
    const res = await DELETE(new Request("http://localhost"), makeParams("1"));
    expect(res.status).toBe(404);
  });

  it("deletes deck successfully", async () => {
    mockGetCurrentUserId.mockResolvedValue("user1");
    mockFindUnique.mockResolvedValue({ id: "1", userId: "user1" });
    mockDeckDelete.mockResolvedValue({});
    const { DELETE } = await getHandlers();
    const res = await DELETE(new Request("http://localhost"), makeParams("1"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(mockDeckDelete).toHaveBeenCalledWith({ where: { id: "1" } });
  });
});
