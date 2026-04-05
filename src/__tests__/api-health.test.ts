import { describe, it, expect, jest, beforeEach } from "@jest/globals";

const mockUserCount = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      count: (...args: unknown[]) => mockUserCount(...args),
    },
  },
}));

async function getHandler() {
  const mod = await import("@/app/api/health/route");
  return mod.GET;
}

describe("GET /api/health", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns ok when database is connected", async () => {
    const GET = await getHandler();
    mockUserCount.mockResolvedValue(5);

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("ok");
    expect(data.database).toBe("connected");
  });

  it("returns 500 when database is disconnected", async () => {
    const GET = await getHandler();
    mockUserCount.mockRejectedValue(new Error("Connection refused"));

    const res = await GET();
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.status).toBe("error");
    expect(data.database).toBe("disconnected");
    expect(data.error).toContain("Connection refused");
  });

  it("handles non-Error thrown values", async () => {
    const GET = await getHandler();
    mockUserCount.mockRejectedValue({ code: "ECONNREFUSED" });

    const res = await GET();
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain("ECONNREFUSED");
  });
});
