import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export async function getSession() {
  return getServerSession(authOptions);
}

export async function getCurrentUserId(): Promise<string | null> {
  const session = await getSession();
  return (session?.user as { id?: string })?.id ?? null;
}

export async function getCurrentUserRole(): Promise<string> {
  const session = await getSession();
  return (session?.user as { role?: string })?.role ?? "user";
}

export async function isAdmin(): Promise<boolean> {
  const role = await getCurrentUserRole();
  return role === "admin";
}
