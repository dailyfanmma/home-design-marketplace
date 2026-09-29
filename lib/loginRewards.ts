import "server-only";
import { prisma } from "@/lib/prisma";
import { grantCredits } from "@/lib/credits";
import { notify } from "@/lib/notifications";
import { unlockAchievement } from "@/lib/achievements";

const DAILY_LOGIN_BASE_CREDITS = 1;
const STREAK_BONUS_EVERY = 5; // an extra credit every 5th consecutive day
const MAX_DAILY_LOGIN_CREDITS = 3;

function isSameCalendarDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function isConsecutiveDay(previous: Date, now: Date) {
  const oneDayMs = 24 * 60 * 60 * 1000;
  return Math.round((startOfDay(now) - startOfDay(previous)) / oneDayMs) === 1;
}

/** Called once per page load (root layout). No-ops if today's bonus was already claimed. */
export async function claimDailyLoginBonus(userId: string) {
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });

    if (user.lastLoginRewardAt && isSameCalendarDay(user.lastLoginRewardAt, now)) {
      return; // already claimed today
    }

    const newStreak = user.lastLoginRewardAt && isConsecutiveDay(user.lastLoginRewardAt, now) ? user.loginStreak + 1 : 1;
    const bonus = Math.min(
      DAILY_LOGIN_BASE_CREDITS + Math.floor(newStreak / STREAK_BONUS_EVERY),
      MAX_DAILY_LOGIN_CREDITS
    );

    await tx.user.update({ where: { id: userId }, data: { loginStreak: newStreak, lastLoginRewardAt: now } });
    await grantCredits(tx, userId, bonus, "DAILY_LOGIN_BONUS", `Day ${newStreak} login streak`);
    await notify(tx, userId, "DAILY_LOGIN_BONUS", `Welcome back! +${bonus} credits for day ${newStreak} of your login streak.`, "/credits");

    if (newStreak >= 7) {
      await unlockAchievement(tx, userId, "STREAK_7");
    }
  });
}
