import { describe, it, expect, jest, beforeEach } from "@jest/globals";

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

async function getHandler() {
  const mod = await import("@/app/api/verify-email/route");
  return mod.GET;
}

describe("GET /api/verify-email", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 without token", async () => {
    const GET = await getHandler();
    const res = await GET(new Request("http://localhost/api/verify-email"));
    expect(res.status).toBe(400);
  });

  it("returns 404 for invalid token", async () => {
    const GET = await getHandler();
    mockUserFindUnique.mockResolvedValue(null);

    const res = await GET(new Request("http://localhost/api/verify-email?token=bad-token"));
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toContain("Invalid");
  });

  it("redirects to login with verified=true on success", async () => {
    const GET = await getHandler();
    mockUserFindUnique.mockResolvedValue({
      id: "u1",
      emailVerified: false,
      verifyToken: "valid-token",
    });
    mockUserUpdate.mockResolvedValue({});

    const res = await GET(new Request("http://localhost/api/verify-email?token=valid-token"));
    expect([302, 307, 308]).toContain(res.status);
    expect(res.headers.get("location")).toContain("/login?verified=true");
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { emailVerified: true, verifyToken: null },
    });
  });

  it("redirects with verified=already if already verified", async () => {
    const GET = await getHandler();
    mockUserFindUnique.mockResolvedValue({
      id: "u1",
      emailVerified: true,
      verifyToken: "old-token",
    });

    const res = await GET(new Request("http://localhost/api/verify-email?token=old-token"));
    expect([302, 307, 308]).toContain(res.status);
    expect(res.headers.get("location")).toContain("/login?verified=already");
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });
});
