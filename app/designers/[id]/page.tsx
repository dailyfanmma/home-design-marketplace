import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function DesignerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const designer = await prisma.user.findUnique({
    where: { id },
    include: {
      entries: {
        include: { votes: true, submission: true },
        orderBy: { createdAt: "desc" },
      },
      bookingsAsDesigner: true,
      reviewsReceived: { include: { author: true }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!designer || designer.role !== "DESIGNER") notFound();

  const wins = designer.bookingsAsDesigner.length;
  const avgRating =
    designer.reviewsReceived.length > 0
      ? designer.reviewsReceived.reduce((sum, r) => sum + r.rating, 0) / designer.reviewsReceived.length
      : null;

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{designer.name}</h1>
        {designer.bio && <p className="max-w-xl text-black/70">{designer.bio}</p>}
        <div className="flex gap-4 pt-1 text-sm text-black/60">
          <span>{wins} hired</span>
          <span>{designer.entries.length} concepts submitted</span>
          {avgRating != null && <span>{avgRating.toFixed(1)}★ ({designer.reviewsReceived.length} reviews)</span>}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Portfolio</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {designer.entries.map((entry) => (
            <Link key={entry.id} href={`/contests/${entry.submissionId}`} className="card overflow-hidden">
              <div className="relative h-32 w-full bg-black/5">
                <Image src={entry.imageUrl} alt={entry.submission.title} fill className="object-cover" unoptimized />
              </div>
              <div className="p-2 text-xs text-black/60">
                {entry.submission.title} · {entry.votes.length} votes
              </div>
            </Link>
          ))}
        </div>
      </div>

      {designer.reviewsReceived.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Reviews</h2>
          <ul className="space-y-2">
            {designer.reviewsReceived.map((r) => (
              <li key={r.id} className="card p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{r.author.name}</span>
                  <span>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                </div>
                <p className="text-sm text-black/70">{r.comment}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
