import type { AchievementKey } from "@/lib/achievements";

export const FLAIRS = {
  design_enthusiast: { label: "🎨 Design Enthusiast", cost: 10 },
  rising_star: { label: "🌟 Rising Star", cost: 20 },
  community_favorite: { label: "👑 Community Favorite", cost: 30 },
  on_a_streak: { label: "🔥 On a Streak", requiresAchievement: "STREAK_7" as AchievementKey },
  contest_champion: { label: "🏆 Contest Champion", requiresAchievement: "DAILY_CONTEST_WINNER" as AchievementKey },
  dealmaker: { label: "🤝 Dealmaker", requiresAchievement: "FIRST_HIRE" as AchievementKey },
} as const;

export type FlairKey = keyof typeof FLAIRS;

export function isPurchasable(key: FlairKey): boolean {
  return "cost" in FLAIRS[key];
}
