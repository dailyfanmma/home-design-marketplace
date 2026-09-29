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

To keep contests from looking empty while the real designer community grows,
the seed data includes 16 clearly-disclosed **AI-persona designers**
(`User.isAiGenerated`) that submit concepts like any other designer. They're
labeled everywhere they appear (a purple "AI persona" badge on every entry
and profile, plus a full disclosure banner on their profile page), excluded
from the login picker, and blocked server-side from ever being hired —
`awardWinner` in `lib/actions.ts` rejects it regardless of what the UI shows.
Real votes still come only from real users: the seed data does not have AI
accounts vote, since that would cross from "seeded supply" into inflating a
public leaderboard.

Homeowners can also generate an instant AI concept for their own room
(`generateAiConcept` in `lib/actions.ts`, `AiConcept` model) for
`GENERATE_CONCEPT_COST` credits — a rough, self-serve starting point, not a
competing contest entry. It's private to the submission's owner, never shown
in the public entries grid, and always disclosed with the same AI badge.
Deliberately kept rougher than a real designer's entry (see
`lib/aiConceptGenerator.ts`) so it's a teaser, not a replacement for the
marketplace's actual value.

Every user has a referral link (`/signup?ref=<their id>`, shown on `/credits`):
referring someone gets you `REFERRAL_SIGNUP_BONUS` credits when they sign up,
plus `REFERRAL_PURCHASE_BONUS_PCT` of every credit pack they ever buy after
that. Since there was previously no way to create a *new* account at all
(only "log in as" a seeded user), this also added a minimal real `/signup`
form — name, email, account type, no password, same MVP-auth spirit as
`/login`.

Every contest now has a real deadline (`Submission.closesAt`) and there's an
in-app **notification center** (the 🔔 in the header). Contests inherited
into an `Event` use that event's `closesAt`; standalone ones get 7 days.
There's no real cron job, so `lib/lifecycle.ts`'s `syncLifecycle()` enforces
deadlines lazily -- it runs at the top of the root layout (every page load)
and inside every action that reads contest/event status, flipping
`OPEN` → `CLOSED` (and `UPCOMING` → `ACTIVE` for events) the moment anyone
next touches the app past the deadline. A `CLOSED` contest stops taking new
entries and votes, but the homeowner can still award a winner from it --
`AWARDED` is the only truly terminal state, since real judging usually
happens after submissions close, not before. Entries, votes, contest
closings, and referral bonuses all create a `Notification` for the relevant
user, shown with an unread badge and on `/notifications`.

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
- `User.isAiGenerated` — flags a seeded AI-persona designer; see "AI-persona designers" above
- `AiConcept` — a homeowner's own instant, private AI concept for their `Submission`; see above
- `User.referredById` — self-relation to whoever referred this user; see "referral" above
- `Submission.closesAt` — when a contest stops accepting entries/votes; enforced by `lib/lifecycle.ts`
- `Notification` — an in-app alert for a user (new entry, new vote, contest closed, hired, referral bonus); see above

## What's stubbed, and what real building looks like next

- **Auth** (`lib/auth.ts`) is a cookie holding a plain user id, set by picking a
  seeded account on `/login`. Replace with NextAuth/Clerk + real signup, and
  add designer onboarding (portfolio, verification).
- **Payments** (`app/bookings/[id]/page.tsx`, `lib/fees.ts`) record the agreed
  fee split but never move money. Replace with Stripe Connect: onboard
  designers as connected accounts, charge the homeowner a
  `designFee + platformFee` payment intent, and payout the designer's cut
  automatically on completion.
- **Concept images** (designer entries) are pasted URLs. A real product would
  let designers upload directly (S3/Cloudinary).
- **`generateAiConcept` is fully stubbed** — `lib/aiConceptGenerator.ts`
  picks a stock photo from a small verified pool by room type instead of
  calling a real image model. Swap its body for a real image-to-image API
  call (ideally against the homeowner's own `photoUrl`) without touching
  `lib/actions.ts`, which only depends on its `{ imageUrl, description }`
  return shape. This is also the AI-persona images' real fix (see below) —
  the same real API would serve both features.
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
- **Events auto-transition on schedule now, but still don't auto-crown a
  winner** — `syncLifecycle()` flips `UPCOMING` → `ACTIVE` → `CLOSED` on
  time, but a real version still needs to decide what "winning" an event (as
  opposed to winning an individual room's contest) even means when it spans
  multiple homeowners' rooms.
- **Lazy lifecycle sync, not a real scheduler** — `syncLifecycle()` only runs
  when someone loads a page or triggers an action, so a contest with zero
  traffic after its deadline will keep showing `OPEN` until the next visit
  (harmless for correctness -- entries/votes/awards all re-check status
  themselves -- but a "closes in 2 hours" notification could arrive late, or
  never, if nobody visits). A real version wants an actual cron job.
- **Notifications are in-app only** — no email or push, so "come back and
  check" still depends on the user opening the app on their own. This is the
  next thing to fix if retention doesn't improve: wire the same `notify()`
  call sites in `lib/actions.ts`/`lib/lifecycle.ts` to also send an email
  (Resend/SendGrid) or push notification, not just write a `Notification` row.
- **No throttling on vote notifications** — a popular entry getting 50 votes
  in an hour means the designer gets 50 separate notifications. Fine for a
  demo; a real version would batch these ("12 new votes on your entry").
- **AI-persona images are reused stock photos**, not real per-entry renders —
  seed data picks from a small pool of verified Unsplash URLs by room type.
  A real version would generate an actual image-to-image render of the
  homeowner's own photo per persona/style (this is also the more interesting
  product direction: real AI-rendered concepts of *your* room, not stock
  photos standing in for them).
- **AI personas can't be hired at all right now** — `awardWinner` rejects it
  outright. If you want AI concepts to ever convert to a real paid outcome,
  that needs a real fulfillment path behind it first (e.g. a vetted human
  designer/contractor actually executes the AI concept) — flipping the
  guard without that would mean charging someone for work nobody delivers.
- **Referrals have no abuse protection** — no email verification, so nothing
  stops someone signing up five throwaway accounts through their own link to
  farm the signup bonus, and the purchase bonus repeats on every pack a
  referral ever buys (not just their first) with no cap. Fine for a demo;
  before this handles real money, add email verification and decide whether
  the purchase bonus should be first-purchase-only or capped.
