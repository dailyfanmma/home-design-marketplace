import type { Prisma } from "@prisma/client";
import { notify } from "@/lib/notifications";

export const ACHIEVEMENTS = {
  FIRST_VOTE: { name: "First Vote", description: "Cast your first vote on a concept.", icon: "🗳️" },
  FIRST_SUBMISSION: { name: "Room Debut", description: "Started your first contest.", icon: "🏠" },
  FIRST_ENTRY: { name: "First Pitch", description: "Submitted your first design concept.", icon: "✏️" },
  FIRST_HIRE: { name: "Hired", description: "Got picked as a contest winner.", icon: "🤝" },
  STREAK_7: { name: "Week-Long Streak", description: "Logged in 7 days in a row.", icon: "🔥" },
  DAILY_CONTEST_WINNER: { name: "Daily Champion", description: "Top-voted entry in a Daily Pick contest.", icon: "🏆" },
  WEEKLY_CONTEST_WINNER: { name: "Weekly Champion", description: "Top-voted entry in a Weekly Pick contest.", icon: "👑" },
  FIRST_REFERRAL: { name: "Recruiter", description: "Referred your first friend.", icon: "🌟" },
} as const;

export type AchievementKey = keyof typeof ACHIEVEMENTS;

type DB = Prisma.TransactionClient;

/** Unlock an achievement if not already owned. Safe to call unconditionally -- no-ops on repeat. */
export async function unlockAchievement(tx: DB, userId: string, key: AchievementKey) {
  const existing = await tx.userAchievement.findUnique({
    where: { userId_achievementKey: { userId, achievementKey: key } },
  });
  if (existing) return;

  await tx.userAchievement.create({ data: { userId, achievementKey: key } });
  const info = ACHIEVEMENTS[key];
  await notify(tx, userId, "ACHIEVEMENT_UNLOCKED", `Achievement unlocked: ${info.icon} ${info.name} -- ${info.description}`, "/profile");
}
