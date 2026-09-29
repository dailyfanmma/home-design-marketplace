import type { Prisma, CreditTxType } from "@prisma/client";

// Everyone starts with 10 free credits (see User.credits default in the
// schema). Credits are the one currency that gates voting, posting into a
// paid event, and leaving a review -- buying more is the monetization lever
// until a real premium subscription replaces it.
export const VOTE_COST = 1;
export const REVIEW_COST = 1;
export const GENERATE_CONCEPT_COST = 2;

export const CREDIT_PACKS = [
  { credits: 20, priceUsd: 5 },
  { credits: 50, priceUsd: 10 },
  { credits: 120, priceUsd: 20 },
] as const;

// Referral rewards go to the REFERRER only -- there's no separate signup
// bonus for the referred person beyond the normal 10 free credits everyone
// gets, since that wasn't asked for and doubling up needs its own abuse
// analysis (self-referral, throwaway accounts) before it's worth adding.
export const REFERRAL_SIGNUP_BONUS = 5;
export const REFERRAL_PURCHASE_BONUS_PCT = 0.5;

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

/** Grant credits inside an existing transaction. Logs a CreditTransaction row. */
export async function grantCredits(tx: Prisma.TransactionClient, userId: string, amount: number, type: CreditTxType, note?: string) {
  await tx.user.update({ where: { id: userId }, data: { credits: { increment: amount } } });
  await tx.creditTransaction.create({ data: { userId, amount, type, note } });
}
