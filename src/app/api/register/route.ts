import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { notifyAdminsNewUser, sendVerificationEmail } from "@/lib/email";

export async function POST(req: Request) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email, password, name } = body;

  if (!email || !password || !name) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    const verifyToken = crypto.randomUUID();

    const user = await prisma.user.create({
      data: { email, name, hashedPassword, verifyToken },
    });

    // Fire-and-forget: don't block registration on email delivery
    sendVerificationEmail(email, name, verifyToken).catch((e) =>
      console.error("[register] Failed to send verification email:", e)
    );
    notifyAdminsNewUser(name, email).catch((e) =>
      console.error("[register] Failed to notify admins:", e)
    );

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
    });
  } catch (error: unknown) {
    // Prisma unique constraint violation (duplicate email)
    if (
      typeof error === "object" && error !== null &&
      "code" in error && (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      );
    }
    console.error("[POST /api/register] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
