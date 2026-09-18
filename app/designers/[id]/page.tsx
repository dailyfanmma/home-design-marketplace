import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { addShowcaseItem } from "@/lib/actions";

export default async function DesignerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const currentUser = await getCurrentUser();

  const designer = await prisma.user.findUnique({
    where: { id },
    include: {
      entries: {
        include: { votes: true, submission: true },
        orderBy: { createdAt: "desc" },
      },
      showcaseItems: { orderBy: { createdAt: "desc" } },
      bookingsAsDesigner: true,
      reviewsReceived: { include: { author: true }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!designer || designer.role !== "DESIGNER") notFound();

  const isOwnProfile = currentUser?.id === designer.id;
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
        <h2 className="text-lg font-semibold">Showcase</h2>
        <p className="text-sm text-black/60">Real projects and offerings, outside of contest entries.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {designer.showcaseItems.map((item) => (
            <div key={item.id} className="card overflow-hidden">
              <div className="relative h-32 w-full bg-black/5">
                <Image src={item.imageUrl} alt={item.title} fill className="object-cover" unoptimized />
              </div>
              <div className="space-y-1 p-2 text-xs">
                <div className="font-medium text-black/80">{item.title}</div>
                <div className="text-black/60">{item.description}</div>
                {item.externalUrl && (
                  <a href={item.externalUrl} target="_blank" rel="noreferrer" className="underline">
                    View project
                  </a>
                )}
              </div>
            </div>
          ))}
          {designer.showcaseItems.length === 0 && (
            <p className="text-sm text-black/50">No showcase projects yet.</p>
          )}
        </div>

        {isOwnProfile && (
          <details className="card p-4">
            <summary className="cursor-pointer text-sm font-medium">Add a showcase project</summary>
            <form action={addShowcaseItem} className="mt-3 space-y-3">
              <input name="title" required placeholder="Title" className="input" />
              <input name="imageUrl" required type="url" placeholder="Image URL" className="input" />
              <textarea name="description" required rows={3} placeholder="Description" className="input" />
              <input name="externalUrl" type="url" placeholder="Link to full project (optional)" className="input" />
              <button type="submit" className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm text-white">
                Add
              </button>
            </form>
          </details>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Contest portfolio</h2>
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
