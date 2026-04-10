import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/auth-helpers";
import { sendEmail } from "@/lib/email";

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

  const { userId, action, playgroupIds } = body;

  if (!userId || !action) {
    return NextResponse.json({ error: "userId and action required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (action === "approve") {
    await prisma.user.update({
      where: { id: userId },
      data: { status: "approved" },
    });

    // Assign to playgroups if provided
    if (playgroupIds?.length) {
      for (const pgId of playgroupIds) {
        const existing = await prisma.playgroupMember.findUnique({
          where: { userId_playgroupId: { userId, playgroupId: pgId } },
        });
        if (!existing) {
          await prisma.playgroupMember.create({
            data: { userId, playgroupId: pgId, role: "member" },
          });
        }
      }
    }

    // Notify user
    sendEmail({
      to: user.email,
      subject: "Your MTG Tracker account has been approved!",
      html: `
        <h2>Welcome, ${user.name}!</h2>
        <p>Your account has been approved. You can now log in and start tracking games.</p>
      `,
    }).catch((e) => console.error("[approve] Failed to send approval email:", e));

    return NextResponse.json({ success: true, status: "approved" });
  }

  if (action === "reject") {
    await prisma.user.update({
      where: { id: userId },
      data: { status: "rejected" },
    });
    return NextResponse.json({ success: true, status: "rejected" });
  }

  return NextResponse.json({ error: "Invalid action (approve or reject)" }, { status: 400 });
}
