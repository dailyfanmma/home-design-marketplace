"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, setCurrentUser, clearCurrentUser } from "@/lib/auth";
import { splitBookingFee } from "@/lib/fees";
import type { RoomType } from "@prisma/client";

export async function loginAs(userId: string) {
  await setCurrentUser(userId);
  redirect("/contests");
}

export async function logout() {
  await clearCurrentUser();
  redirect("/");
}

export async function createSubmission(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "HOMEOWNER") throw new Error("Only homeowners can start a contest.");

  const title = String(formData.get("title") ?? "").trim();
  const roomType = String(formData.get("roomType") ?? "OTHER") as RoomType;
  const description = String(formData.get("description") ?? "").trim();
  const photoUrl = String(formData.get("photoUrl") ?? "").trim();
  const budgetRaw = String(formData.get("budget") ?? "").trim();

  if (!title || !description || !photoUrl) {
    throw new Error("Title, description, and a photo URL are required.");
  }

  const submission = await prisma.submission.create({
    data: {
      homeownerId: user.id,
      title,
      roomType,
      description,
      photoUrl,
      budget: budgetRaw ? Math.round(Number(budgetRaw)) : null,
    },
  });

  revalidatePath("/contests");
  redirect(`/contests/${submission.id}`);
}

export async function createEntry(submissionId: string, formData: FormData) {
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

  const entry = await prisma.entry.create({
    data: {
      submissionId,
      designerId: user.id,
      imageUrl,
      description,
      productLinks: { create: productLinks },
    },
  });

  revalidatePath(`/contests/${submissionId}`);
  redirect(`/contests/${submissionId}?entry=${entry.id}`);
}

export async function castVote(entryId: string, submissionId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Log in to vote.");

  await prisma.vote.upsert({
    where: { entryId_voterId: { entryId, voterId: user.id } },
    create: { entryId, voterId: user.id },
    update: {},
  });

  revalidatePath(`/contests/${submissionId}`);
}

export async function awardWinner(submissionId: string, entryId: string, formData: FormData) {
  const user = await getCurrentUser();
  const submission = await prisma.submission.findUnique({ where: { id: submissionId } });
  if (!user || !submission || submission.homeownerId !== user.id) {
    throw new Error("Only the homeowner who started this contest can award it.");
  }
  if (submission.status !== "OPEN") throw new Error("This contest was already decided.");

  const entry = await prisma.entry.findUnique({ where: { id: entryId } });
  if (!entry || entry.submissionId !== submissionId) throw new Error("That entry doesn't belong to this contest.");

  const designFee = Math.round(Number(formData.get("designFee") ?? 0));
  if (!designFee || designFee <= 0) throw new Error("Enter a design fee greater than zero.");

  const { platformFee, totalCharge } = splitBookingFee(designFee);

  const booking = await prisma.$transaction(async (tx) => {
    await tx.submission.update({ where: { id: submissionId }, data: { status: "AWARDED" } });
    return tx.booking.create({
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

  await prisma.review.create({
    data: {
      bookingId,
      authorId: user.id,
      targetId: booking.designerId,
      rating,
      comment,
    },
  });

  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath(`/designers/${booking.designerId}`);
}
