import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { castVote, awardWinner } from "@/lib/actions";
import { VOTE_COST } from "@/lib/credits";

export default async function ContestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();

  const submission = await prisma.submission.findUnique({
    where: { id },
    include: {
      homeowner: true,
      booking: true,
      event: true,
      entries: {
        include: { designer: true, productLinks: true, votes: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!submission) notFound();

  const entries = [...submission.entries].sort((a, b) => b.votes.length - a.votes.length);
  const isOwner = user?.id === submission.homeownerId;
  const isOpen = submission.status === "OPEN";
  const canAffordVote = (user?.credits ?? 0) >= VOTE_COST;

  return (
    <div className="space-y-8">
      <div className="grid gap-6 sm:grid-cols-[280px_1fr]">
        <div className="relative h-56 w-full overflow-hidden rounded-xl bg-black/5 sm:h-full">
          <Image src={submission.photoUrl} alt={submission.title} fill className="object-cover" unoptimized />
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">{submission.title}</h1>
            <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs font-medium">{submission.status}</span>
            {submission.event && (
              <Link
                href={`/events/${submission.event.id}`}
                className="rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-xs font-medium text-[var(--accent)]"
              >
                {submission.event.theme ?? submission.event.title}
              </Link>
            )}
          </div>
          <div className="text-sm text-black/50">
            {submission.roomType.replace("_", " ")} · started by {submission.homeowner.name}
            {submission.budget ? ` · budget $${submission.budget.toLocaleString()}` : ""}
          </div>
          <p className="text-black/80">{submission.description}</p>
          {isOpen && (
            <Link
              href={`/contests/${submission.id}/entries/new`}
              className="mt-2 inline-block rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm text-white"
            >
              Submit a concept
            </Link>
          )}
          {submission.status === "AWARDED" && submission.booking && (
            <Link href={`/bookings/${submission.booking.id}`} className="mt-2 inline-block text-sm underline">
              View the booking →
            </Link>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">
          Entries {entries.length > 0 && <span className="text-black/40">({entries.length})</span>}
        </h2>

        {entries.length === 0 && <p className="text-black/60">No concepts submitted yet.</p>}

        <div className="grid gap-4 sm:grid-cols-2">
          {entries.map((entry) => {
            const hasVoted = user ? entry.votes.some((v) => v.voterId === user.id) : false;
            return (
              <div key={entry.id} className="card overflow-hidden">
                <div className="relative h-48 w-full bg-black/5">
                  <Image src={entry.imageUrl} alt={entry.description} fill className="object-cover" unoptimized />
                </div>
                <div className="space-y-2 p-4">
                  <div className="flex items-center justify-between">
                    <Link href={`/designers/${entry.designerId}`} className="font-medium underline">
                      {entry.designer.name}
                    </Link>
                    <span className="text-sm font-semibold text-[var(--accent)]">
                      {entry.votes.length} {entry.votes.length === 1 ? "vote" : "votes"}
                    </span>
                  </div>
                  <p className="text-sm text-black/70">{entry.description}</p>

                  {entry.productLinks.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-xs font-semibold uppercase tracking-wide text-black/50">
                        Shop this look
                      </div>
                      <ul className="space-y-0.5 text-sm">
                        {entry.productLinks.map((link) => (
                          <li key={link.id}>
                            <a href={link.url} target="_blank" rel="noreferrer" className="underline">
                              {link.label}
                            </a>
                            {link.price != null && <span className="text-black/50"> — ${link.price}</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {isOpen && user && (
                      <form action={castVote.bind(null, entry.id, submission.id)}>
                        <button
                          type="submit"
                          disabled={hasVoted || !canAffordVote}
                          title={!hasVoted && !canAffordVote ? "Not enough credits" : undefined}
                          className={`rounded-md px-3 py-1.5 text-sm ${
                            hasVoted || !canAffordVote ? "bg-black/10 text-black/40" : "border border-black/20"
                          }`}
                        >
                          {hasVoted ? "Voted" : `Vote (${VOTE_COST} credit)`}
                        </button>
                      </form>
                    )}
                    {isOpen && user && !hasVoted && !canAffordVote && (
                      <Link href="/credits" className="text-xs underline text-black/50">
                        Buy credits to vote
                      </Link>
                    )}

                    {isOpen && isOwner && (
                      <AwardForm submissionId={submission.id} entryId={entry.id} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AwardForm({ submissionId, entryId }: { submissionId: string; entryId: string }) {
  return (
    <form action={awardWinner.bind(null, submissionId, entryId)} className="flex items-center gap-2">
      <input
        name="designFee"
        type="number"
        min="1"
        required
        placeholder="Design fee $"
        className="w-32 rounded-md border border-black/20 px-2 py-1.5 text-sm"
      />
      <button type="submit" className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm text-white">
        Award winner
      </button>
    </form>
  );
}
