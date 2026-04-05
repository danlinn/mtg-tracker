import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.EMAIL_FROM ?? "MTG Tracker <onboarding@resend.dev>";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? null;

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set, skipping email to:", to);
    return null;
  }

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html,
  });

  if (error) {
    console.error("[email] Failed to send:", error);
    return null;
  }

  return data;
}

export async function notifyAdminsNewUser(userName: string, userEmail: string) {
  if (!ADMIN_EMAIL) {
    console.warn("[email] ADMIN_EMAIL not set, skipping admin notification");
    return;
  }

  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `New MTG Tracker signup: ${userName}`,
    html: `
      <h2>New User Registration</h2>
      <p><strong>Name:</strong> ${userName}</p>
      <p><strong>Email:</strong> ${userEmail}</p>
      <p>They can now log in and start tracking games.</p>
    `,
  });
}

export async function sendVerificationEmail(to: string, name: string, token: string) {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const verifyUrl = `${baseUrl}/api/verify-email?token=${token}`;

  await sendEmail({
    to,
    subject: "Verify your MTG Tracker email",
    html: `
      <h2>Welcome to MTG Tracker, ${name}!</h2>
      <p>Please verify your email address by clicking the link below:</p>
      <p><a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:white;text-decoration:none;border-radius:8px;font-weight:bold;">Verify Email</a></p>
      <p>Or copy this link: ${verifyUrl}</p>
      <p>This link expires in 24 hours.</p>
    `,
  });
}
