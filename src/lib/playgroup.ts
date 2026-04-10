import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { getCurrentUserId } from "./auth-helpers";

const COOKIE_NAME = "mtg-active-playgroup";

export async function getActivePlaygroupId(): Promise<string | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE_NAME)?.value;
  if (!value || value === "all") return null;
  return value;
}

export async function getActivePlaygroupIdOrAll(): Promise<string | "all" | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
}

export async function getUserPlaygroups(userId: string) {
  return prisma.playgroupMember.findMany({
    where: { userId },
    include: {
      playgroup: { select: { id: true, name: true } },
    },
    orderBy: { playgroup: { name: "asc" } },
  });
}

export async function isPlaygroupMember(
  userId: string,
  playgroupId: string
): Promise<boolean> {
  const member = await prisma.playgroupMember.findUnique({
    where: { userId_playgroupId: { userId, playgroupId } },
  });
  return !!member;
}

export async function isPlaygroupAdmin(
  userId: string,
  playgroupId: string
): Promise<boolean> {
  const member = await prisma.playgroupMember.findUnique({
    where: { userId_playgroupId: { userId, playgroupId } },
  });
  return member?.role === "admin";
}

export function playgroupFilter(playgroupId: string | null) {
  if (!playgroupId) return {};
  return { playgroupId };
}

export async function getPlaygroupIdsForUser(userId: string): Promise<string[]> {
  const memberships = await prisma.playgroupMember.findMany({
    where: { userId },
    select: { playgroupId: true },
  });
  return memberships.map((m) => m.playgroupId);
}

export async function requireApprovedUser(): Promise<string | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { status: true },
  });
  if (!user || user.status !== "approved") return null;
  return userId;
}
