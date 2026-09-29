import "server-only";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";
import { unlockAchievement } from "@/lib/achievements";
import { ensureSystemContests } from "@/lib/contestGenerator";

// There's no real cron/job runner in this MVP, so contest and event
// deadlines (and the daily/weekly system contest batches) are all enforced
// lazily: call this at the top of any page or action that reads or acts on
// Submission/Event status, and it brings the DB in line with "what time is
// it" before anything else happens. Cheap no-op when nothing has changed.
export async function syncLifecycle() {
  const now = new Date();

  const expiring = await prisma.submission.findMany({
    where: { status: "OPEN", closesAt: { lte: now } },
    select: {
      id: true,
      title: true,
      homeownerId: true,
      isSystemGenerated: true,
      event: { select: { kind: true } },
      _count: { select: { entries: true } },
      entries: {
        select: { designerId: true, designer: { select: { isAiGenerated: true } }, _count: { select: { votes: true } } },
      },
    },
  });

  if (expiring.length > 0) {
    await prisma.submission.updateMany({
      where: { id: { in: expiring.map((s) => s.id) } },
      data: { status: "CLOSED" },
    });

    for (const submission of expiring) {
      const entryCount = submission._count.entries;

      if (submission.isSystemGenerated) {
        // No real homeowner to notify or to award a winner to -- voting just
        // crowns a top entry for bragging rights + an achievement.
        const topEntry = [...submission.entries].sort((a, b) => b._count.votes - a._count.votes)[0];
        if (topEntry && topEntry._count.votes > 0 && !topEntry.designer.isAiGenerated) {
          const key = submission.event?.kind === "WEEKLY" ? "WEEKLY_CONTEST_WINNER" : "DAILY_CONTEST_WINNER";
          await prisma.$transaction(async (tx) => {
            await unlockAchievement(tx, topEntry.designerId, key);
            await notify(
              tx,
              topEntry.designerId,
              "CONTEST_WON",
              `Your concept won "${submission.title}" with ${topEntry._count.votes} votes!`,
              `/contests/${submission.id}`
            );
          });
        }
        continue;
      }

      await notify(
        prisma,
        submission.homeownerId,
        "CONTEST_CLOSED",
        entryCount > 0
          ? `Voting closed on "${submission.title}" -- ${entryCount} ${entryCount === 1 ? "concept is" : "concepts are"} waiting for you to pick a winner.`
          : `"${submission.title}" closed with no entries. You can still browse other contests for inspiration.`,
        `/contests/${submission.id}`
      );
    }
  }

  await prisma.event.updateMany({
    where: { status: "ACTIVE", closesAt: { lte: now } },
    data: { status: "CLOSED" },
  });
  await prisma.event.updateMany({
    where: { status: "UPCOMING", opensAt: { lte: now } },
    data: { status: "ACTIVE" },
  });

  await ensureSystemContests();
}
