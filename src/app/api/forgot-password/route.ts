import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import crypto from "crypto";

const RESET_TTL_HOURS = 1;

export async function POST(req: Request) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email } = body;
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Always return success to prevent email enumeration
  if (!user) {
    return NextResponse.json({ sent: true });
  }

  const resetToken = crypto.randomUUID();
  const resetTokenExp = new Date();
  resetTokenExp.setHours(resetTokenExp.getHours() + RESET_TTL_HOURS);

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken, resetTokenExp },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

  sendEmail({
    to: email,
    subject: "Reset your MTG Tracker password",
    html: `
      <h2>Password Reset</h2>
      <p>Click the link below to reset your password. This link expires in ${RESET_TTL_HOURS} hour.</p>
      <p><a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:white;text-decoration:none;border-radius:8px;font-weight:bold;">Reset Password</a></p>
      <p>Or copy this link: ${resetUrl}</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  }).catch((e) => console.error("[forgot-password] Email send failed:", e));

  return NextResponse.json({ sent: true });
}
