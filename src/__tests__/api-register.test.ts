import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// Mock prisma
const mockFindUnique = jest.fn();
const mockCreate = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

// Mock bcryptjs
jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("hashed-password" as never),
}));

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Lazy import to allow mocks to take effect
async function getHandler() {
  const mod = await import("@/app/api/register/route");
  return mod.POST;
}

describe("POST /api/register", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 when missing required fields", async () => {
    const POST = await getHandler();
    const res = await POST(makeRequest({ email: "test@test.com" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Missing required fields");
  });

  it("returns 400 when email already exists", async () => {
    const POST = await getHandler();
    mockFindUnique.mockResolvedValue({ id: "1", email: "test@test.com" });

    const res = await POST(
      makeRequest({
        email: "test@test.com",
        password: "password123",
        name: "Test",
      })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Email already registered");
  });

  it("creates user successfully", async () => {
    const POST = await getHandler();
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      id: "new-id",
      email: "new@test.com",
      name: "New User",
    });

    const res = await POST(
      makeRequest({
        email: "new@test.com",
        password: "password123",
        name: "New User",
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe("new-id");
    expect(data.email).toBe("new@test.com");
    expect(data.name).toBe("New User");
  });
});
