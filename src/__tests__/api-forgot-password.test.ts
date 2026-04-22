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

jest.mock("@/lib/email", () => ({
  sendEmail: jest.fn(() => Promise.resolve({ success: true })),
}));

async function getHandler() {
  const mod = await import("@/app/api/forgot-password/route");
  return mod.POST;
}

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/forgot-password", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 for invalid JSON", async () => {
    const POST = await getHandler();
    const res = await POST(
      new Request("http://localhost/api/forgot-password", {
        method: "POST",
        body: "not json",
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when email is missing", async () => {
    const POST = await getHandler();
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns success even for unknown emails (no enumeration)", async () => {
    const POST = await getHandler();
    mockUserFindUnique.mockResolvedValue(null);

    const res = await POST(makeRequest({ email: "nobody@example.com" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.sent).toBe(true);
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it("generates a reset token and sends email for valid user", async () => {
    const POST = await getHandler();
    mockUserFindUnique.mockResolvedValue({ id: "user-1", email: "test@example.com" });
    mockUserUpdate.mockResolvedValue({});

    const res = await POST(makeRequest({ email: "test@example.com" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.sent).toBe(true);

    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: expect.objectContaining({
          resetToken: expect.any(String),
          resetTokenExp: expect.any(Date),
        }),
      })
    );
  });
});
