import type { Prisma, NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type DB = Prisma.TransactionClient | typeof prisma;

/** Create a notification. Never throws on a bad recipient -- a missing/AI
 * user just means the row exists and nobody sees it, which is harmless. */
export async function notify(db: DB, userId: string, type: NotificationType, message: string, linkPath?: string) {
  await db.notification.create({ data: { userId, type, message, linkPath } });
}

export async function markAllNotificationsRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}
