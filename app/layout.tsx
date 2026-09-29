import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
import { logout } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { syncLifecycle } from "@/lib/lifecycle";

export const metadata: Metadata = {
  title: "Reno Showdown",
  description: "Submit your room. Designers pitch concepts. The crowd votes. You hire the winner.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // No real cron job in this MVP -- every page load is a chance to catch up
  // on any contest/event that should have closed or opened by now.
  await syncLifecycle();

  const user = await getCurrentUser();
  const unreadCount = user
    ? await prisma.notification.count({ where: { userId: user.id, readAt: null } })
    : 0;

  return (
    <html lang="en">
      <body>
        <header className="border-b border-black/10 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-semibold">
              Reno Showdown
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/contests">Contests</Link>
              <Link href="/events">Events</Link>
              {user ? (
                <>
                  <Link href="/notifications" className="relative">
                    🔔
                    {unreadCount > 0 && (
                      <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-bold text-white">
                        {unreadCount}
                      </span>
                    )}
                  </Link>
                  <Link href="/credits" className="rounded-full bg-black/5 px-2.5 py-1 font-medium">
                    {user.credits} credits
                  </Link>
                  <span className="text-black/50">
                    {user.name} · {user.role.toLowerCase()}
                  </span>
                  <form action={logout}>
                    <button className="text-black/60 underline" type="submit">
                      Log out
                    </button>
                  </form>
                </>
              ) : (
                <Link href="/login" className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-white">
                  Log in
                </Link>
              )}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
