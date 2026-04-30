import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, moxfieldUsername: true },
  });

  return NextResponse.json(user);
}

export async function PUT(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates: Record<string, string | null> = {};

  if ("moxfieldUsername" in body) {
    const val = body.moxfieldUsername?.trim() || null;
    updates.moxfieldUsername = val;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: updates,
    select: { id: true, name: true, email: true, moxfieldUsername: true },
  });

  return NextResponse.json(user);
}
