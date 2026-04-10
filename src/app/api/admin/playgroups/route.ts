import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth-helpers";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const playgroups = await prisma.playgroup.findMany({
    include: {
      _count: { select: { members: true, games: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(playgroups);
}

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, description } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const playgroup = await prisma.playgroup.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
    },
  });

  return NextResponse.json(playgroup);
}
