import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { SUBMISSION_DEFAULT_DURATION_MS } from "../lib/contestDuration";

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

  const submission = await prisma.submission.create({
    data: {
      homeownerId: amy.id,
      eventId: dailyEvent.id,
      closesAt: dailyEvent.closesAt,
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

  const bathroomSubmission = await prisma.submission.create({
    data: {
      homeownerId: raj.id,
      closesAt: new Date(now.getTime() + SUBMISSION_DEFAULT_DURATION_MS),
      title: "Builder-grade bathroom, want spa vibes",
      roomType: "BATHROOM",
      description: "Plain white tile, boring mirror. Going for a calm, warm spa feel on a modest budget.",
      photoUrl: "https://images.unsplash.com/photo-1620626011761-996317b8d101?w=1200",
      budget: 2500,
      status: "OPEN",
    },
  });

  const greenerySubmission = await prisma.submission.create({
    data: {
      homeownerId: raj.id,
      eventId: greeneryEvent.id,
      closesAt: greeneryEvent.closesAt,
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

  // --- AI-persona designers -----------------------------------------------
  // Seeded supply to keep contests active while the real designer community
  // grows. Every persona discloses itself via bio text AND the isAiGenerated
  // flag (rendered as a badge + banner everywhere it appears -- see
  // components/AiBadge.tsx). None are eligible to be hired: awardWinner in
  // lib/actions.ts rejects it server-side regardless of what the UI shows.
  // Not every persona has an entry yet -- e.g. Iris is saved for Rainbow
  // Room Week once that event goes ACTIVE.
  const aiPersonaDefs = [
    { key: "nova", name: "Nova Ashford", bio: "AI design persona. Scandinavian-Japanese minimalism -- light wood, negative space, nothing left on the counters." },
    { key: "gia", name: "GreenHouse Gia", bio: "AI design persona. Biophilic specialist -- if it can hold a plant, it has a plant." },
    { key: "onyx", name: "Max Onyx", bio: "AI design persona. Maximalist -- clashing patterns, saturated color, more is more." },
    { key: "iris", name: "Iris Prism", bio: "AI design persona. Color-drenching specialist, saving up entries for Rainbow Room Week." },
    { key: "otto", name: "Otto Bauhaus", bio: "AI design persona. Mid-century modern -- walnut, brass, clean geometry." },
    { key: "sable", name: "Sable Knox", bio: "AI design persona. Industrial loft -- exposed brick, black steel, Edison bulbs." },
    { key: "coral", name: "Coral Wren", bio: "AI design persona. Coastal and nautical -- whitewash, rope, a little brass." },
    { key: "aiko", name: "Aiko Tanaka-Bot", bio: "AI design persona. Japandi -- Japanese restraint meets Scandinavian warmth." },
    { key: "flo", name: "Farmhand Flo", bio: "AI design persona. Modern farmhouse -- shiplap, apron sinks, black hardware." },
    { key: "delphine", name: "Deco Delphine", bio: "AI design persona. Art Deco glam -- brass, velvet, geometric tile." },
    { key: "remy", name: "Rustic Remy", bio: "AI design persona. Cottagecore -- floral, vintage finds, a little worn-in." },
    { key: "noir", name: "Velvet Noir", bio: "AI design persona. Moody maximalism -- deep greens, black trim, warm brass." },
    { key: "ada", name: "Lumen Ada", bio: "AI design persona. Bright Scandinavian -- white oak, linen, as much daylight as possible." },
    { key: "theo", name: "Terra Cotta Theo", bio: "AI design persona. Mediterranean warmth -- terracotta, arches, olive green." },
    { key: "sage", name: "Chroma Sage", bio: "AI design persona. Color and greenery in equal measure." },
    { key: "bex", name: "Blueprint Bex", bio: "AI design persona. Transitional -- classic bones, current finishes." },
  ] as const;

  const ai: Record<string, Awaited<ReturnType<typeof prisma.user.upsert>>> = {};
  for (const p of aiPersonaDefs) {
    ai[p.key] = await prisma.user.upsert({
      where: { email: `${p.key}.ai@renoshowdown.dev` },
      update: {},
      create: { name: p.name, email: `${p.key}.ai@renoshowdown.dev`, role: "DESIGNER", bio: p.bio, isAiGenerated: true },
    });
  }

  // Kitchen (Daily Contest): 5 AI entries alongside Dana's and Luca's, so
  // today's daily contest actually looks like a daily contest.
  await prisma.entry.createMany({
    data: [
      {
        submissionId: submission.id,
        designerId: ai.otto.id,
        imageUrl: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=1200",
        description: "Walnut-stained lowers, brass hardware, honed soapstone counters to keep the mid-century warmth.",
      },
      {
        submissionId: submission.id,
        designerId: ai.sable.id,
        imageUrl: "https://images.unsplash.com/photo-1567016432779-094069958ea5?w=1200",
        description: "Matte black cabinetry, exposed shelving, a single hanging filament bulb over the sink.",
      },
      {
        submissionId: submission.id,
        designerId: ai.flo.id,
        imageUrl: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1200",
        description: "Shiplap accent wall, a farmhouse apron sink, and warm brass cup pulls throughout.",
      },
      {
        submissionId: submission.id,
        designerId: ai.delphine.id,
        imageUrl: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=1200",
        description: "Black-and-white geometric floor tile, brass trim, a bold Deco light fixture over the island.",
      },
      {
        submissionId: submission.id,
        designerId: ai.ada.id,
        imageUrl: "https://images.unsplash.com/photo-1543353071-873f17a7a088?w=1200",
        description: "White oak lowers, all-white uppers, linen roman shade to soften the one small window.",
      },
    ],
  });

  // Bathroom (standalone, no human entries yet): 4 AI entries so it isn't empty.
  await prisma.entry.createMany({
    data: [
      {
        submissionId: bathroomSubmission.id,
        designerId: ai.coral.id,
        imageUrl: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1200",
        description: "Whitewashed vanity, woven rattan mirror, a thin brass towel rail for a coastal-calm feel.",
      },
      {
        submissionId: bathroomSubmission.id,
        designerId: ai.aiko.id,
        imageUrl: "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=1200",
        description: "Natural stone tile, a low wooden stool, and a single potted fern -- restraint over statement pieces.",
      },
      {
        submissionId: bathroomSubmission.id,
        designerId: ai.noir.id,
        imageUrl: "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=1200",
        description: "Deep forest-green vanity, black fixtures, warm brass sconces either side of the mirror.",
      },
      {
        submissionId: bathroomSubmission.id,
        designerId: ai.remy.id,
        imageUrl: "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=1200",
        description: "A vintage-style clawfoot tub, floral wallpaper, and mismatched brass fixtures for a lived-in feel.",
      },
    ],
  });

  // Greenery Challenge: 3 AI entries alongside Mo's.
  await prisma.entry.createMany({
    data: [
      {
        submissionId: greenerySubmission.id,
        designerId: ai.gia.id,
        imageUrl: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200",
        description: "A full plant wall on a simple grid trellis, paired with plain linen furniture so the greenery leads.",
      },
      {
        submissionId: greenerySubmission.id,
        designerId: ai.sage.id,
        imageUrl: "https://images.unsplash.com/photo-1554995207-c18c203602cb?w=1200",
        description: "Terracotta planters against a warm ochre accent wall -- color and greenery sharing the room.",
      },
      {
        submissionId: greenerySubmission.id,
        designerId: ai.bex.id,
        imageUrl: "https://images.unsplash.com/photo-1449247709967-d4461a6a6103?w=1200",
        description: "Classic slipcovered sofa, brass floor lamp, and a large potted olive tree to keep it current.",
      },
    ],
  });

  const [ottoEntry, floEntry, coralEntry, giaEntry] = await Promise.all([
    prisma.entry.findFirstOrThrow({ where: { submissionId: submission.id, designerId: ai.otto.id } }),
    prisma.entry.findFirstOrThrow({ where: { submissionId: submission.id, designerId: ai.flo.id } }),
    prisma.entry.findFirstOrThrow({ where: { submissionId: bathroomSubmission.id, designerId: ai.coral.id } }),
    prisma.entry.findFirstOrThrow({ where: { submissionId: greenerySubmission.id, designerId: ai.gia.id } }),
  ]);

  // A handful of real votes on AI entries -- from the two real homeowners,
  // never from AI accounts themselves. Seeding AI *submissions* is a
  // legitimate cold-start move; seeding AI *votes* to inflate a public
  // leaderboard would not be, so that's deliberately not done here.
  await prisma.vote.createMany({
    data: [
      { entryId: ottoEntry.id, voterId: raj.id },
      { entryId: coralEntry.id, voterId: raj.id },
      { entryId: floEntry.id, voterId: amy.id },
      { entryId: giaEntry.id, voterId: amy.id },
    ],
  });
  await prisma.user.update({ where: { id: raj.id }, data: { credits: { decrement: 2 } } });
  await prisma.user.update({ where: { id: amy.id }, data: { credits: { decrement: 2 } } });
  await prisma.creditTransaction.createMany({
    data: [
      { userId: raj.id, amount: -1, type: "VOTE_SPEND", note: "Vote cast" },
      { userId: raj.id, amount: -1, type: "VOTE_SPEND", note: "Vote cast" },
      { userId: amy.id, amount: -1, type: "VOTE_SPEND", note: "Vote cast" },
      { userId: amy.id, amount: -1, type: "VOTE_SPEND", note: "Vote cast" },
    ],
  });

  // A few seeded notifications so /notifications isn't empty on first login.
  await prisma.notification.createMany({
    data: [
      {
        userId: amy.id,
        type: "NEW_ENTRY",
        message: "7 designers have entered your kitchen contest -- take a look!",
        linkPath: `/contests/${submission.id}`,
      },
      {
        userId: raj.id,
        type: "NEW_ENTRY",
        message: "4 designers have entered your bathroom contest.",
        linkPath: `/contests/${bathroomSubmission.id}`,
      },
      {
        userId: raj.id,
        type: "NEW_ENTRY",
        message: "3 designers have entered your Greenery Challenge submission.",
        linkPath: `/contests/${greenerySubmission.id}`,
      },
      {
        userId: dana.id,
        type: "NEW_VOTE",
        message: "Raj Patel voted for your concept on \"Dark 90s kitchen needs light\".",
        linkPath: `/contests/${submission.id}`,
      },
      {
        userId: mo.id,
        type: "NEW_VOTE",
        message: "Amy Chen voted for your concept on \"Living room needs plants and life\".",
        linkPath: `/contests/${greenerySubmission.id}`,
      },
    ],
  });

  console.log("Seeded:", {
    homeowners: [amy.email, raj.email],
    humanDesigners: [dana.email, luca.email, mo.email],
    aiPersonas: aiPersonaDefs.length,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
