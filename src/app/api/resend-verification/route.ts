import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { sendVerificationEmail } from "@/lib/email";

export async function POST() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true, emailVerified: true, verifyToken: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.emailVerified) {
    return NextResponse.json({ message: "Already verified" });
  }

  // Generate new token if needed
  const token = user.verifyToken ?? crypto.randomUUID();
  if (!user.verifyToken) {
    await prisma.user.update({
      where: { id: userId },
      data: { verifyToken: token },
    });
  }

  try {
    await sendVerificationEmail(user.email, user.name, token);
    return NextResponse.json({ message: "Verification email sent" });
  } catch (error) {
    console.error("[POST /api/resend-verification] Error:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
