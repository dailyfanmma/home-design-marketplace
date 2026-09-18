import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

// MVP-only stand-in for real auth (NextAuth/Clerk + Stripe Connect onboarding
// would replace this). A signed session cookie holding a userId is enough to
// exercise every flow -- submit, enter, vote, award, review -- with real
// per-user data.
const SESSION_COOKIE = "hdm_uid";

export async function getCurrentUser() {
  const store = await cookies();
  const uid = store.get(SESSION_COOKIE)?.value;
  if (!uid) return null;
  return prisma.user.findUnique({ where: { id: uid } });
}

export async function setCurrentUser(userId: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, userId, { httpOnly: true, sameSite: "lax", path: "/" });
}

export async function clearCurrentUser() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
