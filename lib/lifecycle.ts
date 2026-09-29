import "server-only";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";

// There's no real cron/job runner in this MVP, so contest and event
// deadlines are enforced lazily: call this at the top of any page or action
// that reads or acts on Submission/Event status, and it brings the DB in
// line with "what time is it" before anything else happens. Cheap no-op
// when nothing has actually expired.
export async function syncLifecycle() {
  const now = new Date();

  const expiring = await prisma.submission.findMany({
    where: { status: "OPEN", closesAt: { lte: now } },
    select: { id: true, title: true, homeownerId: true, _count: { select: { entries: true } } },
  });

  if (expiring.length > 0) {
    await prisma.submission.updateMany({
      where: { id: { in: expiring.map((s) => s.id) } },
      data: { status: "CLOSED" },
    });

    for (const submission of expiring) {
      const entryCount = submission._count.entries;
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
}
