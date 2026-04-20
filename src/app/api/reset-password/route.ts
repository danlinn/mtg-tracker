import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { token, password } = body;
  if (!token || !password) {
    return NextResponse.json(
      { error: "Token and password are required" },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { resetToken: token } });

  if (!user) {
    return NextResponse.json(
      { error: "Invalid or expired reset link" },
      { status: 400 }
    );
  }

  if (user.resetTokenExp && user.resetTokenExp < new Date()) {
    return NextResponse.json(
      { error: "Reset link has expired. Please request a new one." },
      { status: 400 }
    );
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      hashedPassword,
      resetToken: null,
      resetTokenExp: null,
    },
  });

  return NextResponse.json({ reset: true });
}
