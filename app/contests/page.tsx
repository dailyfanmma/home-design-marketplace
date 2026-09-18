import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";

export default async function ContestsPage() {
  const submissions = await prisma.submission.findMany({
    orderBy: { createdAt: "desc" },
    include: { homeowner: true, entries: { include: { votes: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Contests</h1>
        <Link href="/contests/new" className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm text-white">
          Start a contest
        </Link>
      </div>

      {submissions.length === 0 && (
        <p className="text-black/60">No contests yet. Be the first to submit a room.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {submissions.map((s) => (
          <Link key={s.id} href={`/contests/${s.id}`} className="card overflow-hidden">
            <div className="relative h-40 w-full bg-black/5">
              <Image src={s.photoUrl} alt={s.title} fill className="object-cover" unoptimized />
            </div>
            <div className="space-y-1 p-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{s.title}</span>
                <StatusBadge status={s.status} />
              </div>
              <div className="text-xs uppercase tracking-wide text-black/50">
                {s.roomType.replace("_", " ")}
              </div>
              <div className="text-sm text-black/60">
                {s.entries.length} {s.entries.length === 1 ? "entry" : "entries"} · by {s.homeowner.name}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    OPEN: "bg-green-100 text-green-800",
    AWARDED: "bg-amber-100 text-amber-800",
    CLOSED: "bg-black/10 text-black/60",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? ""}`}>{status}</span>
  );
}
