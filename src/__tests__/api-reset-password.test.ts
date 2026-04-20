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

jest.mock("bcryptjs", () => ({
  hash: jest.fn(() => Promise.resolve("hashed-pw")),
}));

async function getHandler() {
  const mod = await import("@/app/api/reset-password/route");
  return mod.POST;
}

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/reset-password", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 for invalid JSON", async () => {
    const POST = await getHandler();
    const res = await POST(
      new Request("http://localhost/api/reset-password", {
        method: "POST",
        body: "not json",
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when token or password is missing", async () => {
    const POST = await getHandler();
    const res = await POST(makeRequest({ token: "abc" }));
    expect(res.status).toBe(400);

    const res2 = await POST(makeRequest({ password: "newpass123" }));
    expect(res2.status).toBe(400);
  });

  it("returns 400 for password shorter than 6 characters", async () => {
    const POST = await getHandler();
    const res = await POST(makeRequest({ token: "abc", password: "short" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("6 characters");
  });

  it("returns 400 for invalid token", async () => {
    const POST = await getHandler();
    mockUserFindUnique.mockResolvedValue(null);

    const res = await POST(makeRequest({ token: "bad-token", password: "newpass123" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Invalid");
  });

  it("returns 400 for expired token", async () => {
    const POST = await getHandler();
    const expired = new Date(Date.now() - 3600 * 1000);
    mockUserFindUnique.mockResolvedValue({
      id: "user-1",
      resetToken: "valid-token",
      resetTokenExp: expired,
    });

    const res = await POST(makeRequest({ token: "valid-token", password: "newpass123" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("expired");
  });

  it("resets password and clears token on success", async () => {
    const POST = await getHandler();
    const future = new Date(Date.now() + 3600 * 1000);
    mockUserFindUnique.mockResolvedValue({
      id: "user-1",
      resetToken: "valid-token",
      resetTokenExp: future,
    });
    mockUserUpdate.mockResolvedValue({});

    const res = await POST(makeRequest({ token: "valid-token", password: "newpass123" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.reset).toBe(true);

    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: expect.objectContaining({
          hashedPassword: "hashed-pw",
          resetToken: null,
          resetTokenExp: null,
        }),
      })
    );
  });
});
