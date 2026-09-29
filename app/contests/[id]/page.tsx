import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { castVote, awardWinner, generateAiConcept, commissionPersona } from "@/lib/actions";
import { VOTE_COST, GENERATE_CONCEPT_COST } from "@/lib/credits";
import { CONCEPT_STYLES } from "@/lib/aiConceptGenerator";
import { COMMISSION_COST } from "@/lib/personaCommission";
import { AI_PERSONAS, type PersonaKey } from "@/lib/personas";
import { AiBadge } from "@/components/AiBadge";
import { FLAIRS, type FlairKey } from "@/lib/flair";

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
        where: { commissionId: null }, // private commissioned concepts never show in the public grid
        include: { designer: true, productLinks: true, votes: true },
        orderBy: { createdAt: "asc" },
      },
      aiConcepts: { orderBy: { createdAt: "desc" } },
      commissions: {
        include: { persona: true, entries: { include: { productLinks: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!submission) notFound();

  const entries = [...submission.entries].sort((a, b) => b.votes.length - a.votes.length);
  const isOwner = user?.id === submission.homeownerId;
  const isOpen = submission.status === "OPEN"; // accepting new entries/votes
  const canAward = submission.status !== "AWARDED"; // judging can happen after entries close
  const canAffordVote = (user?.credits ?? 0) >= VOTE_COST;
  const canAffordGenerate = (user?.credits ?? 0) >= GENERATE_CONCEPT_COST;
  const canAffordCommission = (user?.credits ?? 0) >= COMMISSION_COST;
  const alreadyCommissionedIds = new Set(submission.commissions.map((c) => c.personaId));
  const personaOptions = isOwner
    ? (
        await prisma.user.findMany({
          where: { isAiGenerated: true, personaKey: { not: null } },
          select: { id: true, name: true, personaKey: true },
          orderBy: { name: "asc" },
        })
      ).filter((p) => !alreadyCommissionedIds.has(p.id))
    : [];

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
            {submission.isSystemGenerated && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                {submission.event?.kind === "WEEKLY" ? "Weekly Pick" : "Daily Pick"}
              </span>
            )}
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
            {submission.roomType.replace("_", " ")}
            {submission.isSystemGenerated ? " · posted by Reno Showdown" : ` · started by ${submission.homeowner.name}`}
            {submission.budget ? ` · budget $${submission.budget.toLocaleString()}` : ""}
            {isOpen && ` · closes ${submission.closesAt.toLocaleString()}`}
          </div>
          {submission.isSystemGenerated && (
            <p className="text-xs text-black/40">
              A community contest, not a real homeowner&rsquo;s request -- voting crowns a winner, but
              there&rsquo;s no hire or payment on this one.
            </p>
          )}
          <p className="text-black/80">{submission.description}</p>
          {isOpen && (
            <Link
              href={`/contests/${submission.id}/entries/new`}
              className="mt-2 inline-block rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm text-white"
            >
              Submit a concept
            </Link>
          )}
          {submission.status === "CLOSED" && isOwner && (
            <p className="mt-2 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
              Voting has closed. {entries.length > 0
                ? "Pick a winner below to hire them, or leave it as inspiration."
                : "No entries came in this time -- you can start a new contest any time."}
            </p>
          )}
          {submission.status === "AWARDED" && submission.booking && (
            <Link href={`/bookings/${submission.booking.id}`} className="mt-2 inline-block text-sm underline">
              View the booking →
            </Link>
          )}
        </div>
      </div>

      {isOwner && (
        <div className="card space-y-3 p-4">
          <div>
            <h2 className="text-lg font-semibold">Your AI concepts</h2>
            <p className="text-sm text-black/60">
              An instant, rough AI take on your room — private to you, not a contest entry, and not a
              substitute for a real designer&rsquo;s response.
            </p>
          </div>

          {isOpen && (
            <form action={generateAiConcept.bind(null, submission.id)} className="flex flex-wrap items-center gap-2">
              <select
                name="style"
                className="rounded-md border border-black/20 bg-white px-2 py-1.5 text-sm"
                defaultValue={CONCEPT_STYLES[0]}
              >
                {CONCEPT_STYLES.map((style) => (
                  <option key={style} value={style}>
                    {style}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={!canAffordGenerate}
                title={!canAffordGenerate ? "Not enough credits" : undefined}
                className={`rounded-md px-3 py-1.5 text-sm text-white ${
                  canAffordGenerate ? "bg-[var(--accent)]" : "bg-black/20"
                }`}
              >
                Generate ({GENERATE_CONCEPT_COST} credits)
              </button>
              {!canAffordGenerate && (
                <Link href="/credits" className="text-xs underline text-black/50">
                  Buy credits
                </Link>
              )}
            </form>
          )}

          {submission.aiConcepts.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-3">
              {submission.aiConcepts.map((concept) => (
                <div key={concept.id} className="overflow-hidden rounded-lg border border-black/10">
                  <div className="relative h-32 w-full bg-black/5">
                    <Image src={concept.imageUrl} alt={concept.description} fill className="object-cover" unoptimized />
                  </div>
                  <div className="space-y-1 p-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <AiBadge />
                      <span className="font-medium text-black/70">{concept.style}</span>
                    </div>
                    <p className="text-black/60">{concept.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isOwner && (
        <div className="card space-y-3 p-4">
          <div>
            <h2 className="text-lg font-semibold">Commission an AI designer</h2>
            <p className="text-sm text-black/60">
              Pick one of our AI personas and pay for {COMMISSION_COST} credits to get{" "}
              {submission.commissions[0]?.entries.length ?? 3} concepts in their signature style, each with a
              shoppable product link. Private to you, not a contest entry, and each persona always designs the
              same way.
            </p>
          </div>

          {isOpen && personaOptions.length === 0 && (
            <p className="text-xs text-black/40">
              You&rsquo;ve commissioned every persona for this room already -- since each one is
              deterministic, commissioning the same one again would just return the same 3 concepts.
            </p>
          )}

          {isOpen && personaOptions.length > 0 && (
            <form action={commissionPersona.bind(null, submission.id)} className="flex flex-wrap items-center gap-2">
              <select name="personaId" className="rounded-md border border-black/20 bg-white px-2 py-1.5 text-sm" required>
                <option value="">Choose a persona...</option>
                {personaOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {AI_PERSONAS[p.personaKey as PersonaKey]?.style}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={!canAffordCommission}
                title={!canAffordCommission ? "Not enough credits" : undefined}
                className={`rounded-md px-3 py-1.5 text-sm text-white ${
                  canAffordCommission ? "bg-[var(--accent)]" : "bg-black/20"
                }`}
              >
                Commission ({COMMISSION_COST} credits)
              </button>
              {!canAffordCommission && (
                <Link href="/credits" className="text-xs underline text-black/50">
                  Buy credits
                </Link>
              )}
            </form>
          )}

          {submission.commissions.map((commission) => (
            <div key={commission.id} className="space-y-2">
              <div className="flex items-center gap-1.5 text-sm font-medium text-black/70">
                <AiBadge />
                <Link href={`/designers/${commission.personaId}`} className="underline">
                  {commission.persona.name}
                </Link>
                <span className="text-black/40">— {AI_PERSONAS[commission.persona.personaKey as PersonaKey]?.style}</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {commission.entries.map((entry) => (
                  <div key={entry.id} className="overflow-hidden rounded-lg border border-black/10">
                    <div className="relative h-32 w-full bg-black/5">
                      <Image src={entry.imageUrl} alt={entry.description} fill className="object-cover" unoptimized />
                    </div>
                    <div className="space-y-1 p-2 text-xs">
                      <p className="text-black/60">{entry.description}</p>
                      {entry.productLinks.map((link) => (
                        <a key={link.id} href={link.url} target="_blank" rel="noreferrer" className="block underline">
                          {link.label}
                          {link.price != null && ` — $${link.price}`}
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

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
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Link href={`/designers/${entry.designerId}`} className="font-medium underline">
                        {entry.designer.name}
                      </Link>
                      {entry.designer.equippedFlairKey && <span>{FLAIRS[entry.designer.equippedFlairKey as FlairKey]?.label}</span>}
                      {entry.designer.isAiGenerated && <AiBadge />}
                    </div>
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

                    {canAward && isOwner && !entry.designer.isAiGenerated && (
                      <AwardForm submissionId={submission.id} entryId={entry.id} />
                    )}
                    {canAward && isOwner && entry.designer.isAiGenerated && (
                      <span className="text-xs text-black/40">Concept only — not available for hire</span>
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
