import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function EventsPage() {
  const events = await prisma.event.findMany({
    orderBy: [{ status: "asc" }, { closesAt: "asc" }],
    include: { _count: { select: { submissions: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Events</h1>
        <p className="text-sm text-black/60">
          Daily contests and themed challenges. Some charge an entry fee in credits to keep the pool
          curated -- see each event for details.
        </p>
      </div>

      {events.length === 0 && <p className="text-black/60">No events scheduled yet.</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        {events.map((event) => (
          <Link key={event.id} href={`/events/${event.id}`} className="card space-y-1 p-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{event.title}</span>
              <StatusBadge status={event.status} />
            </div>
            <div className="text-xs uppercase tracking-wide text-black/50">
              {event.kind}
              {event.theme ? ` · ${event.theme}` : ""}
            </div>
            <div className="text-sm text-black/60">
              {event._count.submissions} {event._count.submissions === 1 ? "room" : "rooms"} entered
              {event.entryCost > 0 ? ` · ${event.entryCost} credits to enter` : " · free to enter"}
            </div>
            <div className="text-xs text-black/40">Closes {event.closesAt.toLocaleString()}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-800",
    UPCOMING: "bg-blue-100 text-blue-800",
    CLOSED: "bg-black/10 text-black/60",
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? ""}`}>{status}</span>;
}
