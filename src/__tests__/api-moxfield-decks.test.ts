import { describe, it, expect, jest, beforeEach } from "@jest/globals";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: jest.fn() },
  },
}));

jest.mock("@/lib/auth-helpers", () => ({
  getCurrentUserId: jest.fn(),
}));

jest.mock("@/lib/moxfield", () => ({
  moxfieldFetch: jest.fn(),
}));

import { GET } from "@/app/api/moxfield/decks/route";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { moxfieldFetch } from "@/lib/moxfield";

const mockGetUserId = getCurrentUserId as jest.MockedFunction<typeof getCurrentUserId>;
const mockMoxfieldFetch = moxfieldFetch as jest.MockedFunction<typeof moxfieldFetch>;

beforeEach(() => jest.clearAllMocks());

describe("GET /api/moxfield/decks", () => {
  it("returns 401 when not authenticated", async () => {
    mockGetUserId.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost/api/moxfield/decks"));
    expect(res.status).toBe(401);
  });

  it("returns 400 when no moxfield username set", async () => {
    mockGetUserId.mockResolvedValue("user-1");
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ moxfieldUsername: null });
    const res = await GET(new Request("http://localhost/api/moxfield/decks"));
    expect(res.status).toBe(400);
  });

  it("fetches decks using stored username", async () => {
    mockGetUserId.mockResolvedValue("user-1");
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ moxfieldUsername: "danlinn" });
    mockMoxfieldFetch.mockResolvedValue(
      new Response(JSON.stringify({
        data: [
          { publicId: "abc", name: "Test Deck", format: "commander", mainboardCount: 99, colorIdentity: ["W", "U"] },
        ],
      }), { status: 200 })
    );

    const res = await GET(new Request("http://localhost/api/moxfield/decks"));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.username).toBe("danlinn");
    expect(data.decks).toHaveLength(1);
    expect(data.decks[0].name).toBe("Test Deck");
  });

  it("uses username from query param if provided", async () => {
    mockGetUserId.mockResolvedValue("user-1");
    mockMoxfieldFetch.mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), { status: 200 })
    );

    const res = await GET(new Request("http://localhost/api/moxfield/decks?username=otheruser"));
    const data = await res.json();
    expect(data.username).toBe("otheruser");
    expect(mockMoxfieldFetch).toHaveBeenCalledWith(expect.stringContaining("otheruser"));
  });

  it("returns 502 when Moxfield API fails", async () => {
    mockGetUserId.mockResolvedValue("user-1");
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ moxfieldUsername: "danlinn" });
    mockMoxfieldFetch.mockResolvedValue(
      new Response("Not found", { status: 404 })
    );

    const res = await GET(new Request("http://localhost/api/moxfield/decks"));
    expect(res.status).toBe(502);
  });
});
