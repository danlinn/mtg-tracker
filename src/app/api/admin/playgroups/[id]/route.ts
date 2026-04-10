import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin, getCurrentUserId } from "@/lib/auth-helpers";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.playgroup.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, description } = body;

  const updated = await prisma.playgroup.update({
    where: { id },
    data: {
      name: name?.trim() ?? existing.name,
      description: description !== undefined ? (description?.trim() || null) : existing.description,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.playgroup.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.playgroup.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

// Add/remove members and set playgroup admin role
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { action, userId, role } = body;

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  if (action === "add") {
    const existing = await prisma.playgroupMember.findUnique({
      where: { userId_playgroupId: { userId, playgroupId: id } },
    });
    if (existing) {
      return NextResponse.json({ error: "Already a member" }, { status: 400 });
    }
    await prisma.playgroupMember.create({
      data: {
        userId,
        playgroupId: id,
        role: role ?? "member",
      },
    });
    return NextResponse.json({ success: true });
  }

  if (action === "remove") {
    await prisma.playgroupMember.deleteMany({
      where: { userId, playgroupId: id },
    });
    return NextResponse.json({ success: true });
  }

  if (action === "setRole") {
    if (!["admin", "member"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    await prisma.playgroupMember.update({
      where: { userId_playgroupId: { userId, playgroupId: id } },
      data: { role },
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
