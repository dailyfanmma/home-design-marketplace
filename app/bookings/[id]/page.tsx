import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { markBookingComplete, submitReview } from "@/lib/actions";

export default async function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { submission: true, entry: true, designer: true, homeowner: true, review: true },
  });

  if (!booking) notFound();

  const isHomeowner = user?.id === booking.homeownerId;

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Booking</h1>
        <p className="text-sm text-black/60">
          <Link href={`/contests/${booking.submissionId}`} className="underline">
            {booking.submission.title}
          </Link>{" "}
          — hired <Link href={`/designers/${booking.designerId}`} className="underline">{booking.designer.name}</Link>
        </p>
      </div>

      <div className="card space-y-2 p-4">
        <Row label="Design fee" value={`$${booking.designFee.toLocaleString()}`} />
        <Row label="Platform fee" value={`$${booking.platformFee.toLocaleString()}`} />
        <Row label="Total charge" value={`$${booking.totalCharge.toLocaleString()}`} strong />
        <Row label="Status" value={booking.status} />
      </div>

      <p className="text-xs text-black/50">
        Payments aren&rsquo;t wired up yet in this MVP — this is a record of the agreed fee split, not a
        real charge. A production build would run this through Stripe Connect so the designer is paid
        out directly and the platform fee is collected automatically.
      </p>

      {isHomeowner && booking.status === "PENDING" && (
        <form action={markBookingComplete.bind(null, booking.id)}>
          <button type="submit" className="rounded-md bg-[var(--accent)] px-4 py-2 text-white">
            Mark project complete
          </button>
        </form>
      )}

      {isHomeowner && booking.status === "COMPLETED" && !booking.review && (
        <form action={submitReview.bind(null, booking.id)} className="space-y-3">
          <h2 className="text-lg font-semibold">Leave a review</h2>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Rating</span>
            <select name="rating" className="input" defaultValue="5">
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} star{n > 1 ? "s" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Comment</span>
            <textarea name="comment" required rows={3} className="input" />
          </label>
          <button type="submit" className="rounded-md bg-[var(--accent)] px-4 py-2 text-white">
            Submit review
          </button>
        </form>
      )}

      {booking.review && (
        <p className="text-sm text-black/60">
          You reviewed this designer {booking.review.rating}★ — thanks for closing the loop.
        </p>
      )}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${strong ? "font-semibold" : ""}`}>
      <span className="text-black/60">{label}</span>
      <span>{value}</span>
    </div>
  );
}
