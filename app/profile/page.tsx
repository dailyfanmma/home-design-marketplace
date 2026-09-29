import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { buyFlair, equipFlair } from "@/lib/actions";
import { ACHIEVEMENTS, type AchievementKey } from "@/lib/achievements";
import { FLAIRS, isPurchasable, type FlairKey } from "@/lib/flair";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [unlockedAchievements, ownedFlairs] = await Promise.all([
    prisma.userAchievement.findMany({ where: { userId: user.id } }),
    prisma.userFlair.findMany({ where: { userId: user.id } }),
  ]);

  const unlockedKeys = new Set(unlockedAchievements.map((a) => a.achievementKey));
  const ownedKeys = new Set(ownedFlairs.map((f) => f.flairKey));

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{user.name}</h1>
        <div className="mt-1 flex flex-wrap gap-4 text-sm text-black/60">
          <span>{user.credits} credits</span>
          <span>🔥 {user.loginStreak}-day login streak</span>
          <span>{unlockedKeys.size} / {Object.keys(ACHIEVEMENTS).length} achievements</span>
        </div>
        {user.role === "DESIGNER" && (
          <Link href={`/designers/${user.id}`} className="mt-1 inline-block text-sm underline">
            View your public designer profile →
          </Link>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Achievements</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {(Object.entries(ACHIEVEMENTS) as [AchievementKey, (typeof ACHIEVEMENTS)[AchievementKey]][]).map(
            ([key, info]) => {
              const unlocked = unlockedKeys.has(key);
              return (
                <div key={key} className={`card p-3 ${unlocked ? "" : "opacity-50"}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{info.icon}</span>
                    <span className="font-medium">{info.name}</span>
                    {unlocked && <span className="text-xs text-green-700">Unlocked</span>}
                  </div>
                  <p className="mt-0.5 text-xs text-black/60">{info.description}</p>
                </div>
              );
            }
          )}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Profile flair</h2>
        <p className="text-sm text-black/60">
          Shown next to your name everywhere. Some are bought with credits, others are earned by
          unlocking their achievement.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {(Object.entries(FLAIRS) as [FlairKey, (typeof FLAIRS)[FlairKey]][]).map(([key, flair]) => {
            const owned = ownedKeys.has(key);
            const equipped = user.equippedFlairKey === key;
            const purchasable = isPurchasable(key);
            const requiredAchievement = "requiresAchievement" in flair ? flair.requiresAchievement : null;
            const achievementUnlocked = requiredAchievement ? unlockedKeys.has(requiredAchievement) : true;

            return (
              <div key={key} className="card flex items-center justify-between p-3">
                <div>
                  <div className="font-medium">{flair.label}</div>
                  <div className="text-xs text-black/50">
                    {purchasable
                      ? `${(flair as { cost: number }).cost} credits`
                      : `Earned via: ${ACHIEVEMENTS[requiredAchievement!].name}`}
                  </div>
                </div>
                {equipped ? (
                  <span className="text-xs font-medium text-[var(--accent)]">Equipped</span>
                ) : owned || (!purchasable && achievementUnlocked) ? (
                  <form action={equipFlair.bind(null, key)}>
                    <button type="submit" className="rounded-md border border-black/20 px-3 py-1.5 text-sm">
                      Equip
                    </button>
                  </form>
                ) : purchasable ? (
                  <form action={buyFlair.bind(null, key)}>
                    <button
                      type="submit"
                      disabled={user.credits < (flair as { cost: number }).cost}
                      className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm text-white disabled:bg-black/20"
                    >
                      Buy
                    </button>
                  </form>
                ) : (
                  <span className="text-xs text-black/40">Locked</span>
                )}
              </div>
            );
          })}
        </div>
        {user.equippedFlairKey && (
          <form action={equipFlair.bind(null, "")}>
            <button type="submit" className="text-xs underline text-black/50">
              Remove flair
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
