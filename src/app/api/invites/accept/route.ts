import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth-helpers";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing invite token" }, { status: 400 });
  }

  const invite = await prisma.playgroupInvite.findUnique({
    where: { token },
    include: { playgroup: { select: { name: true } } },
  });

  if (!invite) {
    return NextResponse.json({ error: "Invalid invite" }, { status: 404 });
  }

  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invite expired" }, { status: 410 });
  }

  if (invite.usedAt) {
    return NextResponse.json({ error: "Invite already used" }, { status: 410 });
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    // Redirect to registration/login with invite token
    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    return NextResponse.redirect(`${baseUrl}/sign-up-here?invite=${token}`);
  }

  // Add user to playgroup
  const existing = await prisma.playgroupMember.findUnique({
    where: { userId_playgroupId: { userId, playgroupId: invite.playgroupId } },
  });

  if (!existing) {
    await prisma.playgroupMember.create({
      data: {
        userId,
        playgroupId: invite.playgroupId,
        role: "member",
      },
    });
  }

  // Mark invite as used (only for email invites, link invites can be reused)
  if (invite.email) {
    await prisma.playgroupInvite.update({
      where: { id: invite.id },
      data: { usedAt: new Date() },
    });
  }

  // Approve user if still pending
  await prisma.user.update({
    where: { id: userId },
    data: { status: "approved" },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return NextResponse.redirect(`${baseUrl}/dashboard?joined=${invite.playgroup.name}`);
}
