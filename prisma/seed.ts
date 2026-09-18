import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
    skipDuplicates: true,
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
