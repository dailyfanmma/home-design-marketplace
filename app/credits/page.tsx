import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { buyCredits } from "@/lib/actions";
import { CREDIT_PACKS, VOTE_COST, REVIEW_COST, REFERRAL_SIGNUP_BONUS, REFERRAL_PURCHASE_BONUS_PCT } from "@/lib/credits";

export default async function CreditsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [transactions, referrals] = await Promise.all([
    prisma.creditTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.user.findMany({
      where: { referredById: user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, createdAt: true },
    }),
  ]);

  const referralEarnings = await prisma.creditTransaction.aggregate({
    where: { userId: user.id, type: { in: ["REFERRAL_SIGNUP_BONUS", "REFERRAL_PURCHASE_BONUS"] } },
    _sum: { amount: true },
  });

  const host = (await headers()).get("host");
  const referralLink = host ? `${host.includes("localhost") ? "http" : "https"}://${host}/signup?ref=${user.id}` : null;

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Credits</h1>
        <p className="text-3xl font-bold text-[var(--accent)]">{user.credits}</p>
        <p className="text-sm text-black/60">
          Everyone starts with 10 free credits. A vote costs {VOTE_COST}, a review costs {REVIEW_COST},
          and some daily/themed contests charge an entry fee to post a room. Buy more below.
        </p>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Buy credits</h2>
        <p className="text-xs text-black/50">
          Checkout is stubbed for this MVP -- credits are granted immediately, no card charged. See README.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {CREDIT_PACKS.map((pack, i) => (
            <form key={pack.credits} action={buyCredits.bind(null, i)} className="card space-y-2 p-4 text-center">
              <div className="text-xl font-bold">{pack.credits}</div>
              <div className="text-xs text-black/50">credits</div>
              <button type="submit" className="w-full rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm text-white">
                ${pack.priceUsd}
              </button>
            </form>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Refer friends</h2>
        <p className="text-sm text-black/60">
          Get {REFERRAL_SIGNUP_BONUS} credits when someone signs up with your link, plus{" "}
          {REFERRAL_PURCHASE_BONUS_PCT * 100}% of the credits any time they buy a pack.
        </p>
        {referralLink && <input readOnly value={referralLink} className="input font-mono text-xs" />}
        <div className="text-sm text-black/70">
          {referrals.length} {referrals.length === 1 ? "person" : "people"} referred ·{" "}
          {referralEarnings._sum.amount ?? 0} credits earned from referrals
        </div>
        {referrals.length > 0 && (
          <ul className="space-y-1 text-sm text-black/60">
            {referrals.map((r) => (
              <li key={r.id}>{r.name}</li>
            ))}
          </ul>
        )}
      </div>

      {transactions.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">History</h2>
          <ul className="divide-y divide-black/10 text-sm">
            {transactions.map((tx) => (
              <li key={tx.id} className="flex items-center justify-between py-2">
                <span className="text-black/70">{tx.note ?? tx.type}</span>
                <span className={tx.amount > 0 ? "text-green-700" : "text-black/60"}>
                  {tx.amount > 0 ? "+" : ""}
                  {tx.amount}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
