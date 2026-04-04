import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth-helpers";

const VALID_THEMES = ["default", "old-school", "synth", "cyber", "flame", "chris"];

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ theme: "default" });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { theme: true },
  });

  return NextResponse.json({ theme: user?.theme ?? "default" });
}

export async function PUT(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { theme } = await request.json();
  if (!VALID_THEMES.includes(theme)) {
    return NextResponse.json({ error: "Invalid theme" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { theme },
  });

  return NextResponse.json({ theme });
}
