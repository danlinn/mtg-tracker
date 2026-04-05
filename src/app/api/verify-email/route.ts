import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { verifyToken: token },
  });

  if (!user) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 404 });
  }

  if (user.emailVerified) {
    return NextResponse.redirect(new URL("/login?verified=already", req.url));
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, verifyToken: null },
  });

  return NextResponse.redirect(new URL("/login?verified=true", req.url));
}
