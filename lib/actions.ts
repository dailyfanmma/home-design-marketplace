"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, setCurrentUser, clearCurrentUser } from "@/lib/auth";
import { splitBookingFee } from "@/lib/fees";
import {
  spendCredits,
  grantCredits,
  VOTE_COST,
  REVIEW_COST,
  GENERATE_CONCEPT_COST,
  CREDIT_PACKS,
  REFERRAL_SIGNUP_BONUS,
  REFERRAL_PURCHASE_BONUS_PCT,
} from "@/lib/credits";
import { generateConcept, CONCEPT_STYLES, type ConceptStyle } from "@/lib/aiConceptGenerator";
import { generateCommissionConcepts, COMMISSION_COST } from "@/lib/personaCommission";
import { syncLifecycle } from "@/lib/lifecycle";
import { notify, markAllNotificationsRead } from "@/lib/notifications";
import { unlockAchievement } from "@/lib/achievements";
import { FLAIRS, isPurchasable, type FlairKey } from "@/lib/flair";
import { SUBMISSION_DEFAULT_DURATION_MS } from "@/lib/contestDuration";
import type { PersonaKey } from "@/lib/personas";
import type { RoomType } from "@prisma/client";

export async function loginAs(userId: string) {
  await setCurrentUser(userId);
  redirect("/contests");
}

export async function signUp(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "HOMEOWNER") as "HOMEOWNER" | "DESIGNER";
  const referrerId = String(formData.get("ref") ?? "").trim() || null;

  if (!name || !email) throw new Error("Name and email are required.");
  if (role !== "HOMEOWNER" && role !== "DESIGNER") throw new Error("Pick a valid account type.");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("An account with that email already exists -- try logging in instead.");

  const referrer = referrerId ? await prisma.user.findUnique({ where: { id: referrerId } }) : null;

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { name, email, role, referredById: referrer?.id },
    });
    if (referrer) {
      await grantCredits(tx, referrer.id, REFERRAL_SIGNUP_BONUS, "REFERRAL_SIGNUP_BONUS", `${name} signed up via your referral link`);
      await notify(tx, referrer.id, "REFERRAL_SIGNUP", `${name} signed up using your referral link -- you earned ${REFERRAL_SIGNUP_BONUS} credits.`, "/credits");
      await unlockAchievement(tx, referrer.id, "FIRST_REFERRAL");
    }
    return created;
  });

  await setCurrentUser(user.id);
  redirect("/contests");
}

export async function logout() {
  await clearCurrentUser();
  redirect("/");
}

export async function createSubmission(formData: FormData) {
  await syncLifecycle();

  const user = await getCurrentUser();
  if (!user || user.role !== "HOMEOWNER") throw new Error("Only homeowners can start a contest.");

  const title = String(formData.get("title") ?? "").trim();
  const roomType = String(formData.get("roomType") ?? "OTHER") as RoomType;
  const description = String(formData.get("description") ?? "").trim();
  const photoUrl = String(formData.get("photoUrl") ?? "").trim();
  const budgetRaw = String(formData.get("budget") ?? "").trim();
  const eventId = String(formData.get("eventId") ?? "").trim() || null;

  if (!title || !description || !photoUrl) {
    throw new Error("Title, description, and a photo URL are required.");
  }

  const event = eventId ? await prisma.event.findUnique({ where: { id: eventId } }) : null;
  if (eventId && (!event || event.status !== "ACTIVE")) {
    throw new Error("That contest isn't open for entries right now.");
  }

  const closesAt = event ? event.closesAt : new Date(Date.now() + SUBMISSION_DEFAULT_DURATION_MS);

  const submission = await prisma.$transaction(async (tx) => {
    if (event && event.entryCost > 0) {
      await spendCredits(tx, user.id, event.entryCost, "EVENT_ENTRY_SPEND", `Entered "${event.title}"`);
    }
    const created = await tx.submission.create({
      data: {
        homeownerId: user.id,
        eventId: event?.id,
        title,
        roomType,
        description,
        photoUrl,
        budget: budgetRaw ? Math.round(Number(budgetRaw)) : null,
        closesAt,
      },
    });
    await unlockAchievement(tx, user.id, "FIRST_SUBMISSION");
    return created;
  });

  revalidatePath("/contests");
  revalidatePath("/events");
  redirect(`/contests/${submission.id}`);
}

export async function createEntry(submissionId: string, formData: FormData) {
  await syncLifecycle();

  const user = await getCurrentUser();
  if (!user || user.role !== "DESIGNER") throw new Error("Only designers can submit a concept.");

  const submission = await prisma.submission.findUnique({ where: { id: submissionId } });
  if (!submission || submission.status !== "OPEN") throw new Error("This contest is no longer open.");

  const imageUrl = String(formData.get("imageUrl") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!imageUrl || !description) throw new Error("An image URL and description are required.");

  const labels = formData.getAll("productLabel").map(String);
  const urls = formData.getAll("productUrl").map(String);
  const prices = formData.getAll("productPrice").map(String);

  const productLinks = labels
    .map((label, i) => ({ label: label.trim(), url: urls[i]?.trim() ?? "", price: prices[i] ? Number(prices[i]) : null }))
    .filter((link) => link.label && link.url);

  const entry = await prisma.$transaction(async (tx) => {
    const created = await tx.entry.create({
      data: {
        submissionId,
        designerId: user.id,
        imageUrl,
        description,
        productLinks: { create: productLinks },
      },
    });
    await notify(
      tx,
      submission.homeownerId,
      "NEW_ENTRY",
      `${user.name} submitted a concept for "${submission.title}".`,
      `/contests/${submissionId}`
    );
    await unlockAchievement(tx, user.id, "FIRST_ENTRY");
    return created;
  });

  revalidatePath(`/contests/${submissionId}`);
  redirect(`/contests/${submissionId}?entry=${entry.id}`);
}

export async function generateAiConcept(submissionId: string, formData: FormData) {
  await syncLifecycle();

  const user = await getCurrentUser();
  const submission = await prisma.submission.findUnique({ where: { id: submissionId } });
  if (!user || !submission || submission.homeownerId !== user.id) {
    throw new Error("Only the homeowner who started this contest can generate a concept for it.");
  }
  if (submission.status !== "OPEN") throw new Error("This contest is no longer open.");

  const style = String(formData.get("style") ?? "") as ConceptStyle;
  if (!CONCEPT_STYLES.includes(style)) throw new Error("Pick a valid style.");

  const { imageUrl, description } = generateConcept(submission.roomType, style);

  await prisma.$transaction(async (tx) => {
    await spendCredits(tx, user.id, GENERATE_CONCEPT_COST, "GENERATE_CONCEPT_SPEND", `Generated a "${style}" concept`);
    await tx.aiConcept.create({ data: { submissionId, style, imageUrl, description } });
  });

  revalidatePath(`/contests/${submissionId}`);
}

export async function commissionPersona(submissionId: string, formData: FormData) {
  await syncLifecycle();

  const user = await getCurrentUser();
  const submission = await prisma.submission.findUnique({ where: { id: submissionId } });
  if (!user || !submission || submission.homeownerId !== user.id) {
    throw new Error("Only the homeowner who started this contest can commission a concept for it.");
  }
  if (submission.status !== "OPEN") throw new Error("This contest is no longer open.");

  const personaId = String(formData.get("personaId") ?? "");
  const persona = await prisma.user.findUnique({ where: { id: personaId } });
  if (!persona || !persona.isAiGenerated || !persona.personaKey) {
    throw new Error("Pick a valid AI persona to commission.");
  }

  const concepts = generateCommissionConcepts(persona.personaKey as PersonaKey, submission.roomType);

  await prisma.$transaction(async (tx) => {
    await spendCredits(tx, user.id, COMMISSION_COST, "COMMISSION_SPEND", `Commissioned ${persona.name} for "${submission.title}"`);
    const commission = await tx.commission.create({
      data: { submissionId, personaId: persona.id, buyerId: user.id, cost: COMMISSION_COST },
    });
    for (const concept of concepts) {
      await tx.entry.create({
        data: {
          submissionId,
          designerId: persona.id,
          commissionId: commission.id,
          imageUrl: concept.imageUrl,
          description: concept.description,
          productLinks: { create: [{ label: concept.productLink.label, price: concept.productLink.price, url: "https://example.com/product" }] },
        },
      });
    }
  });

  revalidatePath(`/contests/${submissionId}`);
}

export async function castVote(entryId: string, submissionId: string) {
  await syncLifecycle();

  const user = await getCurrentUser();
  if (!user) throw new Error("Log in to vote.");

  const submission = await prisma.submission.findUnique({ where: { id: submissionId } });
  if (!submission || submission.status !== "OPEN") throw new Error("Voting has closed on this contest.");

  const existing = await prisma.vote.findUnique({
    where: { entryId_voterId: { entryId, voterId: user.id } },
  });
  if (existing) return; // already voted -- no-op, don't charge twice

  const entry = await prisma.entry.findUniqueOrThrow({ where: { id: entryId }, include: { designer: true } });
  if (entry.commissionId) throw new Error("This is a private commissioned concept, not a contest entry -- it can't be voted on.");

  await prisma.$transaction(async (tx) => {
    await spendCredits(tx, user.id, VOTE_COST, "VOTE_SPEND", "Vote cast");
    await tx.vote.create({ data: { entryId, voterId: user.id } });
    if (!entry.designer.isAiGenerated) {
      await notify(tx, entry.designerId, "NEW_VOTE", `${user.name} voted for your concept on "${submission.title}".`, `/contests/${submissionId}`);
    }
    await unlockAchievement(tx, user.id, "FIRST_VOTE");
  });

  revalidatePath(`/contests/${submissionId}`);
}

export async function awardWinner(submissionId: string, entryId: string, formData: FormData) {
  await syncLifecycle();

  const user = await getCurrentUser();
  const submission = await prisma.submission.findUnique({ where: { id: submissionId } });
  if (!user || !submission || submission.homeownerId !== user.id) {
    throw new Error("Only the homeowner who started this contest can award it.");
  }
  // OPEN or CLOSED can both be awarded -- judging happens after entries close.
  // AWARDED is the only truly terminal state.
  if (submission.status === "AWARDED") throw new Error("This contest was already decided.");
  if (submission.isSystemGenerated) {
    throw new Error("This is a Daily/Weekly Pick contest -- there's no real homeowner behind it to hire for.");
  }

  const entry = await prisma.entry.findUnique({ where: { id: entryId }, include: { designer: true } });
  if (!entry || entry.submissionId !== submissionId) throw new Error("That entry doesn't belong to this contest.");
  if (entry.designer.isAiGenerated) {
    throw new Error("This is an AI-generated concept, not a real designer -- it can't be hired.");
  }

  const designFee = Math.round(Number(formData.get("designFee") ?? 0));
  if (!designFee || designFee <= 0) throw new Error("Enter a design fee greater than zero.");

  const { platformFee, totalCharge } = splitBookingFee(designFee);

  const booking = await prisma.$transaction(async (tx) => {
    await tx.submission.update({ where: { id: submissionId }, data: { status: "AWARDED" } });
    const created = await tx.booking.create({
      data: {
        submissionId,
        entryId,
        designerId: entry.designerId,
        homeownerId: user.id,
        designFee,
        platformFee,
        totalCharge,
      },
    });
    await notify(
      tx,
      entry.designerId,
      "ENTRY_AWARDED",
      `${user.name} hired you for "${submission.title}" -- $${designFee} design fee.`,
      `/bookings/${created.id}`
    );
    await unlockAchievement(tx, entry.designerId, "FIRST_HIRE");
    return created;
  });

  revalidatePath(`/contests/${submissionId}`);
  redirect(`/bookings/${booking.id}`);
}

export async function markBookingComplete(bookingId: string) {
  const user = await getCurrentUser();
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!user || !booking || booking.homeownerId !== user.id) {
    throw new Error("Only the homeowner on this booking can mark it complete.");
  }

  await prisma.booking.update({ where: { id: bookingId }, data: { status: "COMPLETED" } });
  revalidatePath(`/bookings/${bookingId}`);
}

export async function submitReview(bookingId: string, formData: FormData) {
  const user = await getCurrentUser();
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!user || !booking || booking.homeownerId !== user.id) {
    throw new Error("Only the homeowner on this booking can leave a review.");
  }
  if (booking.status !== "COMPLETED") throw new Error("Mark the booking complete before reviewing it.");

  const rating = Number(formData.get("rating") ?? 0);
  const comment = String(formData.get("comment") ?? "").trim();
  if (rating < 1 || rating > 5) throw new Error("Rating must be between 1 and 5.");

  await prisma.$transaction(async (tx) => {
    await spendCredits(tx, user.id, REVIEW_COST, "REVIEW_SPEND", "Left a review");
    await tx.review.create({
      data: {
        bookingId,
        authorId: user.id,
        targetId: booking.designerId,
        rating,
        comment,
      },
    });
  });

  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath(`/designers/${booking.designerId}`);
}

export async function buyCredits(packIndex: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Log in to buy credits.");

  const pack = CREDIT_PACKS[packIndex];
  if (!pack) throw new Error("Unknown credit pack.");

  // Stubbed checkout -- a real version charges pack.priceUsd via Stripe
  // before granting credits. See README "What's stubbed".
  await prisma.$transaction(async (tx) => {
    await grantCredits(tx, user.id, pack.credits, "PURCHASE", `Purchased ${pack.credits} credits for $${pack.priceUsd}`);

    if (user.referredById) {
      const bonus = Math.round(pack.credits * REFERRAL_PURCHASE_BONUS_PCT);
      if (bonus > 0) {
        await grantCredits(
          tx,
          user.referredById,
          bonus,
          "REFERRAL_PURCHASE_BONUS",
          `${user.name} (your referral) bought ${pack.credits} credits`
        );
        await notify(
          tx,
          user.referredById,
          "REFERRAL_PURCHASE",
          `${user.name} (your referral) bought credits -- you earned ${bonus} credits.`,
          "/credits"
        );
      }
    }
  });

  revalidatePath("/credits");
}

export async function addShowcaseItem(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "DESIGNER") throw new Error("Only designer accounts have a showcase.");

  const title = String(formData.get("title") ?? "").trim();
  const imageUrl = String(formData.get("imageUrl") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const externalUrl = String(formData.get("externalUrl") ?? "").trim() || null;

  if (!title || !imageUrl || !description) {
    throw new Error("Title, image URL, and description are required.");
  }

  await prisma.showcaseItem.create({
    data: { designerId: user.id, title, imageUrl, description, externalUrl },
  });

  revalidatePath(`/designers/${user.id}`);
}

export async function markAllRead() {
  const user = await getCurrentUser();
  if (!user) return;

  await markAllNotificationsRead(user.id);
  revalidatePath("/notifications");
  revalidatePath("/", "layout");
}

export async function buyFlair(flairKey: FlairKey) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Log in to buy a flair.");

  const flair = FLAIRS[flairKey];
  if (!flair) throw new Error("Unknown flair.");
  if (!isPurchasable(flairKey)) throw new Error("This flair can only be unlocked by earning its achievement.");

  const alreadyOwned = await prisma.userFlair.findUnique({ where: { userId_flairKey: { userId: user.id, flairKey } } });
  if (alreadyOwned) {
    await prisma.user.update({ where: { id: user.id }, data: { equippedFlairKey: flairKey } });
    revalidatePath("/profile");
    return;
  }

  await prisma.$transaction(async (tx) => {
    await spendCredits(tx, user.id, "cost" in flair ? flair.cost : 0, "FLAIR_PURCHASE", `Bought the "${flair.label}" flair`);
    await tx.userFlair.create({ data: { userId: user.id, flairKey } });
    await tx.user.update({ where: { id: user.id }, data: { equippedFlairKey: flairKey } });
  });

  revalidatePath("/profile");
  revalidatePath("/", "layout");
}

export async function equipFlair(flairKey: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Log in first.");

  if (flairKey) {
    const owned = await prisma.userFlair.findUnique({ where: { userId_flairKey: { userId: user.id, flairKey } } });
    if (!owned) throw new Error("You don't own that flair yet.");
  }

  await prisma.user.update({ where: { id: user.id }, data: { equippedFlairKey: flairKey || null } });
  revalidatePath("/profile");
  revalidatePath("/", "layout");
}
