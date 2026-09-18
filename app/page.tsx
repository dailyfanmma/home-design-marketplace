import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h1 className="text-3xl font-bold">Post your room. Get a room makeover contest.</h1>
        <p className="max-w-2xl text-black/70">
          Snap a photo of the kitchen, bathroom, or living room you want to redo. Interior design
          hobbyists and pros submit AI-rendered concepts. The public votes. You pick a winner and
          hire them for the real thing.
        </p>
        <div className="flex gap-3">
          <Link href="/contests/new" className="rounded-md bg-[var(--accent)] px-4 py-2 text-white">
            Start a contest
          </Link>
          <Link href="/contests" className="rounded-md border border-black/20 px-4 py-2">
            Browse contests
          </Link>
        </div>
      </section>

      <section className="grid gap-6 sm:grid-cols-3">
        <Step n={1} title="Submit a room">
          One photo, a budget, and what you want to change.
        </Step>
        <Step n={2} title="Designers pitch concepts">
          AI-rendered redesigns with shoppable product links, not mood boards.
        </Step>
        <Step n={3} title="Crowd votes, you hire">
          Pick the winner. We handle the design fee and take a flat cut.
        </Step>
      </section>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="card p-4">
      <div className="mb-2 text-sm font-semibold text-[var(--accent)]">Step {n}</div>
      <div className="mb-1 font-semibold">{title}</div>
      <p className="text-sm text-black/70">{children}</p>
    </div>
  );
}
