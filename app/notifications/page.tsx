import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { markAllRead } from "@/lib/actions";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="max-w-lg space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {unreadCount > 0 && (
          <form action={markAllRead}>
            <button type="submit" className="text-sm underline text-black/60">
              Mark all as read
            </button>
          </form>
        )}
      </div>

      {notifications.length === 0 && (
        <p className="text-black/60">
          Nothing yet -- you&rsquo;ll hear about new entries, votes, and contest results here.
        </p>
      )}

      <ul className="space-y-2">
        {notifications.map((n) => {
          const body = (
            <div className={`card p-3 ${n.readAt ? "" : "border-[var(--accent)]/40 bg-[var(--accent)]/5"}`}>
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-black/80">{n.message}</p>
                {!n.readAt && <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-[var(--accent)]" />}
              </div>
              <div className="mt-1 text-xs text-black/40">{n.createdAt.toLocaleString()}</div>
            </div>
          );
          return (
            <li key={n.id}>{n.linkPath ? <Link href={n.linkPath}>{body}</Link> : body}</li>
          );
        })}
      </ul>
    </div>
  );
}
