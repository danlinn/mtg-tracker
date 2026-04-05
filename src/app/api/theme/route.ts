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
    select: { theme: true, emailVerified: true },
  });

  const theme = user?.theme && VALID_THEMES.includes(user.theme) ? user.theme : "default";

  return NextResponse.json({
    theme,
    emailVerified: user?.emailVerified ?? false,
  });
}

export async function PUT(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { theme } = body;
  if (!VALID_THEMES.includes(theme)) {
    return NextResponse.json({ error: "Invalid theme" }, { status: 400 });
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { theme },
    });
    return NextResponse.json({ theme });
  } catch (error) {
    console.error("[PUT /api/theme] Error:", error);
    return NextResponse.json({ error: "Failed to update theme" }, { status: 500 });
  }
}
