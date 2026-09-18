import { prisma } from "@/lib/prisma";
import { loginAs } from "@/lib/actions";

export default async function LoginPage() {
  const users = await prisma.user.findMany({ orderBy: [{ role: "asc" }, { name: "asc" }] });

  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-2xl font-bold">Log in</h1>
      <p className="text-sm text-black/60">
        MVP stand-in for real auth: pick a seeded account to try each role. Run{" "}
        <code>npm run db:seed</code> if this list is empty.
      </p>
      <ul className="space-y-2">
        {users.map((u) => (
          <li key={u.id} className="card flex items-center justify-between p-3">
            <div>
              <div className="font-medium">{u.name}</div>
              <div className="text-xs uppercase tracking-wide text-black/50">{u.role}</div>
            </div>
            <form action={loginAs.bind(null, u.id)}>
              <button type="submit" className="rounded-md border border-black/20 px-3 py-1.5 text-sm">
                Log in as {u.name.split(" ")[0]}
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
