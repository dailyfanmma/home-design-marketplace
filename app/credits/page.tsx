import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { buyCredits } from "@/lib/actions";
import { CREDIT_PACKS, VOTE_COST, REVIEW_COST } from "@/lib/credits";

export default async function CreditsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const transactions = await prisma.creditTransaction.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

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
