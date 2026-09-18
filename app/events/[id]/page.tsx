import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      submissions: {
        include: { homeowner: true, entries: { include: { votes: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!event) notFound();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{event.title}</h1>
        <div className="text-sm text-black/60">
          {event.kind}
          {event.theme ? ` · ${event.theme}` : ""} · closes {event.closesAt.toLocaleString()}
        </div>
        <p className="text-sm text-black/60">
          {event.entryCost > 0
            ? `Costs ${event.entryCost} credits for a homeowner to enter a room.`
            : "Free to enter."}
        </p>
        {event.status === "ACTIVE" && (
          <Link
            href={`/contests/new?eventId=${event.id}`}
            className="mt-2 inline-block rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm text-white"
          >
            Enter this event
          </Link>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {event.submissions.map((s) => (
          <Link key={s.id} href={`/contests/${s.id}`} className="card overflow-hidden">
            <div className="relative h-40 w-full bg-black/5">
              <Image src={s.photoUrl} alt={s.title} fill className="object-cover" unoptimized />
            </div>
            <div className="p-3">
              <div className="font-semibold">{s.title}</div>
              <div className="text-sm text-black/60">
                {s.entries.length} entries · by {s.homeowner.name}
              </div>
            </div>
          </Link>
        ))}
        {event.submissions.length === 0 && <p className="text-black/60">No rooms entered yet.</p>}
      </div>
    </div>
  );
}
