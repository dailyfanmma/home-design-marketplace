import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

async function main() {
  const [amy, raj] = await Promise.all([
    prisma.user.upsert({
      where: { email: "amy@example.com" },
      update: {},
      create: { name: "Amy Chen", email: "amy@example.com", role: "HOMEOWNER" },
    }),
    prisma.user.upsert({
      where: { email: "raj@example.com" },
      update: {},
      create: { name: "Raj Patel", email: "raj@example.com", role: "HOMEOWNER" },
    }),
  ]);

  const [dana, luca, mo] = await Promise.all([
    prisma.user.upsert({
      where: { email: "dana@example.com" },
      update: {},
      create: {
        name: "Dana Fields",
        email: "dana@example.com",
        role: "DESIGNER",
        bio: "Warm minimalist. 6 years freelance, ex-Havenly.",
      },
    }),
    prisma.user.upsert({
      where: { email: "luca@example.com" },
      update: {},
      create: {
        name: "Luca Moreno",
        email: "luca@example.com",
        role: "DESIGNER",
        bio: "Bold color, small-space specialist.",
      },
    }),
    prisma.user.upsert({
      where: { email: "mo@example.com" },
      update: {},
      create: {
        name: "Mo Whitfield",
        email: "mo@example.com",
        role: "DESIGNER",
        bio: "Hobbyist, does this on weekends. Loves a moody kitchen.",
      },
    }),
  ]);

  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: { name: "Site Admin", email: "admin@example.com", role: "ADMIN" },
  });

  const submission = await prisma.submission.create({
    data: {
      homeownerId: amy.id,
      title: "Dark 90s kitchen needs light",
      roomType: "KITCHEN",
      description:
        "Oak cabinets, brass fixtures, no natural light. Want something brighter and more modern without a full gut renovation.",
      photoUrl: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200",
      budget: 6000,
      status: "OPEN",
      entries: {
        create: [
          {
            designerId: dana.id,
            imageUrl: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1200",
            description: "Whitewashed cabinets, brushed nickel hardware, and a light oak island to keep some warmth.",
            productLinks: {
              create: [
                { label: "Cabinet paint kit", url: "https://example.com/paint", price: 89, retailer: "Home Depot" },
                { label: "Brushed nickel handles (10-pack)", url: "https://example.com/handles", price: 34 },
              ],
            },
          },
          {
            designerId: luca.id,
            imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200",
            description: "Two-tone: sage lowers, white uppers, statement pendant lighting over the island.",
            productLinks: {
              create: [{ label: "Sage cabinet paint", url: "https://example.com/sage", price: 95 }],
            },
          },
        ],
      },
    },
    include: { entries: true },
  });

  await prisma.vote.createMany({
    data: [
      { entryId: submission.entries[0].id, voterId: raj.id },
      { entryId: submission.entries[0].id, voterId: mo.id },
      { entryId: submission.entries[1].id, voterId: amy.id },
    ],
  });

  await prisma.submission.create({
    data: {
      homeownerId: raj.id,
      title: "Builder-grade bathroom, want spa vibes",
      roomType: "BATHROOM",
      description: "Plain white tile, boring mirror. Going for a calm, warm spa feel on a modest budget.",
      photoUrl: "https://images.unsplash.com/photo-1620626011761-996317b8d101?w=1200",
      budget: 2500,
      status: "OPEN",
    },
  });

  const now = new Date();
  const dailyEvent = await prisma.event.create({
    data: {
      title: "Today's Daily Contest",
      kind: "DAILY",
      entryCost: 3,
      opensAt: now,
      closesAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      status: "ACTIVE",
    },
  });

  const greeneryEvent = await prisma.event.create({
    data: {
      title: "Greenery Challenge",
      theme: "Greenery",
      kind: "THEMED",
      entryCost: 5,
      opensAt: now,
      closesAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      status: "ACTIVE",
    },
  });

  await prisma.event.create({
    data: {
      title: "Rainbow Room Week",
      theme: "Rainbow",
      kind: "THEMED",
      entryCost: 5,
      opensAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      closesAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      status: "UPCOMING",
    },
  });

  const greenerySubmission = await prisma.submission.create({
    data: {
      homeownerId: raj.id,
      eventId: greeneryEvent.id,
      title: "Living room needs plants and life",
      roomType: "LIVING_ROOM",
      description: "Beige box living room. Want it to feel like a jungle, within reason.",
      photoUrl: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1200",
      budget: 1200,
      status: "OPEN",
      entries: {
        create: [
          {
            designerId: mo.id,
            imageUrl: "https://images.unsplash.com/photo-1600121848594-d8644e57abab?w=1200",
            description: "Floor-to-ceiling shelving stuffed with monstera, pothos, and a fiddle leaf fig anchor plant.",
            productLinks: {
              create: [{ label: "Fiddle leaf fig", url: "https://example.com/fiddle-leaf", price: 65 }],
            },
          },
        ],
      },
    },
    include: { entries: true },
  });

  await prisma.vote.createMany({
    data: [{ entryId: greenerySubmission.entries[0].id, voterId: amy.id }],
  });

  // Reconcile seeded credit balances with the votes/entries above: amy voted
  // twice (kitchen + greenery), raj voted once and paid to enter Greenery,
  // mo voted once. Every decrement here has a matching CreditTransaction row.
  await prisma.user.update({ where: { id: amy.id }, data: { credits: { decrement: 2 } } });
  await prisma.user.update({ where: { id: raj.id }, data: { credits: { decrement: 1 + greeneryEvent.entryCost } } });
  await prisma.user.update({ where: { id: mo.id }, data: { credits: { decrement: 1 } } });
  await prisma.creditTransaction.createMany({
    data: [
      { userId: raj.id, amount: -greeneryEvent.entryCost, type: "EVENT_ENTRY_SPEND", note: `Entered "${greeneryEvent.title}"` },
      { userId: raj.id, amount: -1, type: "VOTE_SPEND", note: "Vote cast" },
      { userId: mo.id, amount: -1, type: "VOTE_SPEND", note: "Vote cast" },
      { userId: amy.id, amount: -1, type: "VOTE_SPEND", note: "Vote cast" },
      { userId: amy.id, amount: -1, type: "VOTE_SPEND", note: "Vote cast" },
    ],
  });

  await prisma.submission.update({
    where: { id: submission.id },
    data: { eventId: dailyEvent.id },
  });

  await prisma.showcaseItem.createMany({
    data: [
      {
        designerId: dana.id,
        title: "Full kitchen remodel, Oak Park bungalow",
        imageUrl: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1200",
        description: "Real client project, 2025. Shaker cabinets, quartz counters, $18k budget.",
        externalUrl: "https://example.com/portfolio/oak-park",
      },
      {
        designerId: luca.id,
        title: "Studio apartment color drenching",
        imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200",
        description: "Turned a 400 sq ft rental into a bold, colorful home on a $2k budget.",
      },
    ],
  });

  console.log("Seeded:", { homeowners: [amy.email, raj.email], designers: [dana.email, luca.email, mo.email] });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
