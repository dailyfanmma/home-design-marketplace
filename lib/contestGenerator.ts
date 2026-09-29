// No "server-only" guard here (unlike lib/lifecycle.ts etc.) -- prisma/seed.ts
// imports this module directly via plain tsx, outside Next's bundler, and
// the real server-only package throws unconditionally when required outside
// Next's server/client aliasing.
import { prisma } from "@/lib/prisma";
import type { RoomType } from "@prisma/client";

const SYSTEM_ACCOUNT_EMAIL = "contests@renoshowdown.dev";

const ROOM_POOL: Record<RoomType, { photoIds: string[]; title: string; description: string }> = {
  KITCHEN: {
    photoIds: ["1556909114-f6e7ad7d3136", "1583847268964-b28dc8f51f92"],
    title: "Community Kitchen Challenge",
    description: "A plain, dated kitchen -- give it your best redesign.",
  },
  BATHROOM: {
    photoIds: ["1620626011761-996317b8d101", "1600489000022-c2086d79f9d4"],
    title: "Community Bathroom Challenge",
    description: "Builder-grade and forgettable -- make it feel like a real retreat.",
  },
  LIVING_ROOM: {
    photoIds: ["1600210492486-724fe5c67fb0", "1560448204-e02f11c3d0e2"],
    title: "Community Living Room Challenge",
    description: "Safe, beige, and a little boring -- bring it to life.",
  },
  BEDROOM: {
    photoIds: ["1600566753086-00f18fb6b3ea", "1571508601891-ca5e7a713859"],
    title: "Community Bedroom Challenge",
    description: "Functional but uninspired -- design the retreat it should be.",
  },
  OUTDOOR: {
    photoIds: ["1600607687939-ce8a6c25118c", "1533749047139-189de3cf06d3"],
    title: "Community Outdoor Challenge",
    description: "An unused backyard corner -- turn it into somewhere people want to sit.",
  },
  HOME_OFFICE: {
    photoIds: ["1518481852452-9415b262eba4", "1600607687920-4e2a09cf159d"],
    title: "Community Home Office Challenge",
    description: "A corner desk that isn't working -- design a real work-from-home setup.",
  },
  ENTRYWAY: {
    photoIds: ["1593642532400-2682810df593", "1519710164239-da123dc03ef4"],
    title: "Community Entryway Challenge",
    description: "The first thing you see coming home, and it shows no thought at all.",
  },
  OTHER: {
    photoIds: ["1554995207-c18c203602cb"],
    title: "Community Space Challenge",
    description: "An oddball space that doesn't know what it wants to be yet.",
  },
};

const DAILY_CATEGORIES: RoomType[] = ["KITCHEN", "BATHROOM", "OUTDOOR"];
const WEEKLY_CATEGORIES: RoomType[] = ["LIVING_ROOM", "HOME_OFFICE"];

async function getOrCreateSystemAccount() {
  return prisma.user.upsert({
    where: { email: SYSTEM_ACCOUNT_EMAIL },
    update: {},
    create: {
      name: "Reno Showdown",
      email: SYSTEM_ACCOUNT_EMAIL,
      role: "HOMEOWNER",
      isSystemAccount: true,
      bio: "The house account behind daily and weekly community contests.",
    },
  });
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function ensureContestBatch(kind: "DAILY" | "WEEKLY", categories: RoomType[], durationMs: number, entryCost: number) {
  const now = new Date();
  const existing = await prisma.event.findFirst({
    where: { kind, status: { in: ["ACTIVE", "UPCOMING"] }, closesAt: { gt: now } },
  });
  if (existing) return;

  const houseAccount = await getOrCreateSystemAccount();
  const closesAt = new Date(now.getTime() + durationMs);
  const label = kind === "DAILY" ? "Daily" : "Weekly";

  const event = await prisma.event.create({
    data: {
      title: `${label} Contests -- ${now.toLocaleDateString()}`,
      kind,
      entryCost,
      opensAt: now,
      closesAt,
      status: "ACTIVE",
    },
  });

  await prisma.submission.createMany({
    data: categories.map((roomType) => {
      const room = ROOM_POOL[roomType];
      return {
        homeownerId: houseAccount.id,
        eventId: event.id,
        closesAt,
        title: room.title,
        roomType,
        description: room.description,
        photoUrl: `https://images.unsplash.com/photo-${pick(room.photoIds)}?w=1200`,
        isSystemGenerated: true,
      };
    }),
  });
}

/** Called from syncLifecycle. Cheap no-op once today's/this week's batch already exists. */
export async function ensureSystemContests() {
  await ensureContestBatch("DAILY", DAILY_CATEGORIES, 24 * 60 * 60 * 1000, 2);
  await ensureContestBatch("WEEKLY", WEEKLY_CATEGORIES, 7 * 24 * 60 * 60 * 1000, 4);
}
