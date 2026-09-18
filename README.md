# Reno Showdown

A contest-style marketplace for home makeovers:

1. A homeowner submits a photo of a room and what they want changed.
2. Interior design hobbyists and pros submit AI-rendered concepts, with links to
   the real products used.
3. The public votes on entries.
4. The homeowner picks a winner and hires them; the platform records the design
   fee and takes a flat percentage on top.

This is an MVP scaffold: real auth, real payments, and real image generation
are stubbed out so the core contest → vote → hire → review loop is fully
functional and easy to demo.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Prisma + SQLite for local dev (swap `DATABASE_URL` for Postgres in production)
- Server Actions for all writes (submit contest, submit entry, vote, award, review) — no separate API layer

## Getting started

```bash
cp .env.example .env
npm install
npm run db:push    # creates prisma/dev.db from the schema
npm run db:seed    # seeds 2 homeowners, 3 designers, 1 sample contest with entries + votes
npm run dev
```

Open http://localhost:3000, then `/login` and pick a seeded account — that's
the stand-in for real auth (see "Next steps" below).

## Data model

`prisma/schema.prisma` has the full picture. Core flow:

- `User` — `HOMEOWNER`, `DESIGNER`, or `ADMIN`
- `Submission` — a homeowner's room + the contest around it (`OPEN` → `AWARDED` → `CLOSED`)
- `Entry` — a designer's concept image + description + `ProductLink[]`, attached to a `Submission`
- `Vote` — one per (entry, voter), enforced with a unique constraint
- `Booking` — created when a homeowner awards an entry; stores `designFee`,
  `platformFee` (flat `PLATFORM_FEE_PCT`, see `lib/fees.ts`), and `totalCharge`
- `Review` — left by the homeowner once a `Booking` is `COMPLETED`

## What's stubbed, and what real building looks like next

- **Auth** (`lib/auth.ts`) is a cookie holding a plain user id, set by picking a
  seeded account on `/login`. Replace with NextAuth/Clerk + real signup, and
  add designer onboarding (portfolio, verification).
- **Payments** (`app/bookings/[id]/page.tsx`, `lib/fees.ts`) record the agreed
  fee split but never move money. Replace with Stripe Connect: onboard
  designers as connected accounts, charge the homeowner a
  `designFee + platformFee` payment intent, and payout the designer's cut
  automatically on completion.
- **Concept images** are pasted URLs. A real product would let designers
  upload directly (S3/Cloudinary) and could offer an in-app AI render step
  (e.g. an image-to-image API against the homeowner's photo) so designers
  don't need their own tools.
- **Contest lifecycle** has no deadline/auto-close — add a `closesAt` on
  `Submission` and a cron/job to flip `OPEN` → `CLOSED` when it passes without
  an award.
- **Trust & safety**: no report/flag flow, no moderation queue for entries or
  reviews, no rate limiting on votes beyond the one-per-user constraint.
- **Product links** are unvalidated free-text URLs; a real version would want
  affiliate-network integration (Amazon Associates, etc.) instead of raw
  designer-supplied links, both for monetization and liability.
