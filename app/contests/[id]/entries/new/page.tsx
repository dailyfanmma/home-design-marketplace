import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createEntry } from "@/lib/actions";

export default async function NewEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const submission = await prisma.submission.findUnique({ where: { id } });
  if (!submission) notFound();

  if (user.role !== "DESIGNER") {
    return <p className="text-black/70">Only designer accounts can submit a concept.</p>;
  }
  if (submission.status !== "OPEN") {
    return <p className="text-black/70">This contest is no longer accepting entries.</p>;
  }

  const boundCreateEntry = createEntry.bind(null, id);

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-2xl font-bold">Pitch a concept for &ldquo;{submission.title}&rdquo;</h1>
      <p className="text-sm text-black/60">
        Paste a link to your AI-rendered redesign (Midjourney, an interior-AI tool, whatever you used)
        and list the real products someone would buy to recreate it.
      </p>
      <form action={boundCreateEntry} className="space-y-4">
        <Field label="Rendered concept image URL">
          <input name="imageUrl" required type="url" className="input" placeholder="https://..." />
        </Field>
        <Field label="Describe your concept">
          <textarea name="description" required rows={4} className="input" />
        </Field>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Product links (optional, up to 3)</legend>
          {[0, 1, 2].map((i) => (
            <div key={i} className="grid grid-cols-[1fr_2fr_90px] gap-2">
              <input name="productLabel" placeholder="Item" className="input" />
              <input name="productUrl" type="url" placeholder="https://..." className="input" />
              <input name="productPrice" type="number" min="0" placeholder="$" className="input" />
            </div>
          ))}
        </fieldset>

        <button type="submit" className="rounded-md bg-[var(--accent)] px-4 py-2 text-white">
          Submit entry
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
