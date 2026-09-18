import type { Prisma, CreditTxType } from "@prisma/client";

// Everyone starts with 10 free credits (see User.credits default in the
// schema). Credits are the one currency that gates voting, posting into a
// paid event, and leaving a review -- buying more is the monetization lever
// until a real premium subscription replaces it.
export const VOTE_COST = 1;
export const REVIEW_COST = 1;

export const CREDIT_PACKS = [
  { credits: 20, priceUsd: 5 },
  { credits: 50, priceUsd: 10 },
  { credits: 120, priceUsd: 20 },
] as const;

/** Deduct credits inside an existing transaction, throwing if the balance is too low. Logs a CreditTransaction row. */
export async function spendCredits(
  tx: Prisma.TransactionClient,
  userId: string,
  amount: number,
  type: CreditTxType,
  note?: string
) {
  const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.credits < amount) {
    throw new Error(`Not enough credits (need ${amount}, have ${user.credits}). Buy more on /credits.`);
  }

  await tx.user.update({ where: { id: userId }, data: { credits: { decrement: amount } } });
  await tx.creditTransaction.create({
    data: { userId, amount: -amount, type, note },
  });
}
