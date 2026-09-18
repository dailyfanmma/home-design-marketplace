import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createSubmission } from "@/lib/actions";
import { prisma } from "@/lib/prisma";

export default async function NewContestPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "HOMEOWNER") {
    return <p className="text-black/70">Only homeowner accounts can start a contest.</p>;
  }

  const { eventId } = await searchParams;
  const activeEvents = await prisma.event.findMany({ where: { status: "ACTIVE" }, orderBy: { closesAt: "asc" } });

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-2xl font-bold">Submit your room</h1>
      <form action={createSubmission} className="space-y-4">
        <Field label="Title">
          <input name="title" required className="input" placeholder="Cramped 90s kitchen needs light" />
        </Field>
        <Field label="Room type">
          <select name="roomType" className="input" defaultValue="KITCHEN">
            <option value="KITCHEN">Kitchen</option>
            <option value="BATHROOM">Bathroom</option>
            <option value="LIVING_ROOM">Living room</option>
            <option value="BEDROOM">Bedroom</option>
            <option value="OUTDOOR">Outdoor</option>
            <option value="OTHER">Other</option>
          </select>
        </Field>
        <Field label="Enter into">
          <select name="eventId" className="input" defaultValue={eventId ?? ""}>
            <option value="">Standalone contest (free, open-ended)</option>
            {activeEvents.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title}
                {event.entryCost > 0 ? ` — ${event.entryCost} credits` : " — free"}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Photo URL">
          <input name="photoUrl" required type="url" className="input" placeholder="https://..." />
        </Field>
        <Field label="What do you want changed?">
          <textarea name="description" required rows={4} className="input" />
        </Field>
        <Field label="Budget (USD, optional)">
          <input name="budget" type="number" min="0" className="input" placeholder="5000" />
        </Field>
        <button type="submit" className="rounded-md bg-[var(--accent)] px-4 py-2 text-white">
          Launch contest
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}
