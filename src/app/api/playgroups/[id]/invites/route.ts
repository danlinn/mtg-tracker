import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth-helpers";
import { isPlaygroupAdmin, isPlaygroupMember } from "@/lib/playgroup";
import { sendEmail } from "@/lib/email";

const INVITE_TTL_DAYS = 7;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (!(await isPlaygroupMember(userId, id))) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const invites = await prisma.playgroupInvite.findMany({
    where: { playgroupId: id },
    include: {
      invitedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(invites);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Any member can invite
  if (!(await isPlaygroupMember(userId, id))) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email } = body;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_TTL_DAYS);

  const invite = await prisma.playgroupInvite.create({
    data: {
      email: email?.trim() || null,
      playgroupId: id,
      invitedById: userId,
      expiresAt,
    },
    include: {
      playgroup: { select: { name: true } },
    },
  });

  // Send invite email if email provided
  if (email?.trim()) {
    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const inviteUrl = `${baseUrl}/api/invites/accept?token=${invite.token}`;

    const inviter = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    sendEmail({
      to: email.trim(),
      subject: `You're invited to ${invite.playgroup.name} on MTG Tracker`,
      html: `
        <h2>Playgroup Invite</h2>
        <p><strong>${inviter?.name ?? "Someone"}</strong> invited you to join <strong>${invite.playgroup.name}</strong> on MTG Tracker.</p>
        <p><a href="${inviteUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:white;text-decoration:none;border-radius:8px;font-weight:bold;">Accept Invite</a></p>
        <p>Or copy this link: ${inviteUrl}</p>
        <p>This invite expires in ${INVITE_TTL_DAYS} days.</p>
      `,
    }).catch((e) =>
      console.error("[invite] Failed to send invite email:", e)
    );
  }

  return NextResponse.json({
    id: invite.id,
    token: invite.token,
    email: invite.email,
    expiresAt: invite.expiresAt,
  });
}
