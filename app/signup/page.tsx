import { prisma } from "@/lib/prisma";
import { signUp } from "@/lib/actions";
import { REFERRAL_SIGNUP_BONUS } from "@/lib/credits";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;
  const referrer = ref ? await prisma.user.findUnique({ where: { id: ref } }) : null;

  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-2xl font-bold">Sign up</h1>
      {referrer && (
        <p className="rounded-md bg-purple-50 p-3 text-sm text-purple-900">
          You were referred by {referrer.name} — they&rsquo;ll get {REFERRAL_SIGNUP_BONUS} credits once
          you sign up.
        </p>
      )}
      <p className="text-sm text-black/60">
        MVP stand-in for real auth: no password, just a name and email. Already have an account?{" "}
        <a href="/login" className="underline">
          Log in
        </a>{" "}
        instead.
      </p>
      <form action={signUp} className="space-y-4">
        {referrer && <input type="hidden" name="ref" value={referrer.id} />}
        <Field label="Name">
          <input name="name" required className="input" placeholder="Jordan Lee" />
        </Field>
        <Field label="Email">
          <input name="email" required type="email" className="input" placeholder="you@example.com" />
        </Field>
        <Field label="I am a...">
          <select name="role" className="input" defaultValue="HOMEOWNER">
            <option value="HOMEOWNER">Homeowner — I want to submit a room</option>
            <option value="DESIGNER">Designer — I want to submit concepts</option>
          </select>
        </Field>
        <button type="submit" className="rounded-md bg-[var(--accent)] px-4 py-2 text-white">
          Create account
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
