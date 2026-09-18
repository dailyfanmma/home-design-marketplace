# Reno Showdown

A contest-style marketplace for home makeovers:

1. A homeowner submits a photo of a room and what they want changed — either
   as a standalone open-ended contest, or into a live daily/themed **event**
   (e.g. "Today's Daily Contest", "Greenery Challenge").
2. Interior design hobbyists and pros submit AI-rendered concepts, with links to
   the real products used.
3. The public votes on entries, spending **credits** to do so.
4. The homeowner picks a winner and hires them; the platform records the design
   fee and takes a flat percentage on top.
5. The homeowner leaves a review once the project is done.

Everyone starts with 10 free credits; voting, leaving a review, and entering
some events cost credits, and users can buy more. Designers also keep a
public **showcase** of real past work on their profile, separate from the
contest entries they've submitted.

This is an MVP scaffold: real auth, real payments, and real image generation
are stubbed out so the core contest → vote → hire → review loop, and the
credit economy around it, are fully functional and easy to demo.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Prisma + SQLite for local dev (swap `DATABASE_URL` for Postgres in production)
- Server Actions for all writes (submit contest, submit entry, vote, award, review) — no separate API layer

## Getting started

```bash
cp .env.example .env
npm install
npm run db:push    # creates prisma/dev.db from the schema
npm run db:seed    # seeds 2 homeowners, 3 designers, sample contests/events/votes/showcase items
npm run dev
```

Open http://localhost:3000, then `/login` and pick a seeded account — that's
the stand-in for real auth (see "Next steps" below).

## Data model

`prisma/schema.prisma` has the full picture. Core flow:

- `User` — `HOMEOWNER`, `DESIGNER`, or `ADMIN`; carries a `credits` balance (default 10)
- `Event` — a daily or themed contest cycle (`DAILY` / `THEMED`, with an optional
  `theme` like "Greenery"), `UPCOMING` → `ACTIVE` → `CLOSED`, with an optional
  `entryCost` in credits
- `Submission` — a homeowner's room + the contest around it (`OPEN` → `AWARDED` → `CLOSED`);
  optionally tagged to an `Event`
- `Entry` — a designer's concept image + description + `ProductLink[]`, attached to a `Submission`
- `Vote` — one per (entry, voter), enforced with a unique constraint; costs `VOTE_COST` credits
- `Booking` — created when a homeowner awards an entry; stores `designFee`,
  `platformFee` (flat `PLATFORM_FEE_PCT`, see `lib/fees.ts`), and `totalCharge`
- `Review` — left by the homeowner once a `Booking` is `COMPLETED`; costs `REVIEW_COST` credits
- `CreditTransaction` — an audit log row for every credit grant or spend (see `lib/credits.ts`)
- `ShowcaseItem` — a designer's real past project, shown on their profile alongside contest entries

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
- **Credit purchases** (`/credits`, `buyCredits` in `lib/actions.ts`) grant
  credits immediately with no real charge. Replace with a real checkout
  (Stripe Checkout/Payment Element) before granting the balance.
- **No premium subscription tier** — credits are pay-per-action only. A real
  version would likely add an unlimited-actions subscription alongside
  credits, which is a billing-provider decision (Stripe Billing) more than a
  schema change.
- **Events don't auto-close or auto-crown a winner** — `Event.status` is set
  by hand (see seed data). A real version needs a job that flips
  `ACTIVE` → `CLOSED` at `closesAt` and decides what "winning" an event (as
  opposed to winning an individual room's contest) even means when it spans
  multiple homeowners' rooms.
