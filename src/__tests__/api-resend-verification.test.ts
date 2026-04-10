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

const mockSendVerification = jest.fn();
jest.mock("@/lib/email", () => ({
  sendVerificationEmail: (...args: unknown[]) => mockSendVerification(...args),
}));

describe("POST /api/resend-verification", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockGetCurrentUserId.mockResolvedValue(null);
    const { POST } = await import("@/app/api/resend-verification/route");
    const res = await POST();
    expect(res.status).toBe(401);
  });

  it("returns 404 when user not found", async () => {
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockUserFindUnique.mockResolvedValue(null);
    const { POST } = await import("@/app/api/resend-verification/route");
    const res = await POST();
    expect(res.status).toBe(404);
  });

  it("returns already verified", async () => {
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockUserFindUnique.mockResolvedValue({ emailVerified: true });
    const { POST } = await import("@/app/api/resend-verification/route");
    const res = await POST();
    const data = await res.json();
    expect(data.message).toBe("Already verified");
  });

  it("sends verification email", async () => {
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockUserFindUnique.mockResolvedValue({
      email: "a@b.com",
      name: "Alice",
      emailVerified: false,
      verifyToken: "existing-token",
    });
    mockSendVerification.mockResolvedValue({ success: true });
    const { POST } = await import("@/app/api/resend-verification/route");
    const res = await POST();
    const data = await res.json();
    expect(data.message).toBe("Verification email sent");
  });

  it("generates new token if missing", async () => {
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockUserFindUnique.mockResolvedValue({
      email: "a@b.com",
      name: "Alice",
      emailVerified: false,
      verifyToken: null,
    });
    mockUserUpdate.mockResolvedValue({});
    mockSendVerification.mockResolvedValue({ success: true });
    const { POST } = await import("@/app/api/resend-verification/route");
    const res = await POST();
    expect(res.status).toBe(200);
    expect(mockUserUpdate).toHaveBeenCalled();
  });

  it("returns 500 when email fails", async () => {
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockUserFindUnique.mockResolvedValue({
      email: "a@b.com",
      name: "Alice",
      emailVerified: false,
      verifyToken: "tok",
    });
    mockSendVerification.mockResolvedValue({ success: false, error: "API error" });
    const { POST } = await import("@/app/api/resend-verification/route");
    const res = await POST();
    expect(res.status).toBe(500);
  });
});
