# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack
Astro (static output), plain CSS with custom properties, vanilla TypeScript for interaction. No UI framework. Decided by John, 10 Oct 2026.
Deploy target undecided (prototype is shared for click-through review).

## Users
**Salon owner** (primary): checks the business in a couple of minutes a day, decides where marketing money goes, spots clients slipping away. Often on a phone between clients.
**Front desk / manager**: replies to guests, takes hand-offs from the AI, confirms booking requests, works the day's schedule, mostly on a desktop or tablet at the desk.
**Stylist**: sees their own clients and day. **Marketing partner (agency / VA)**: reads campaign results, manages forms and Brand Hub content.
Inferred from `prism-ai/brain/01-product.md` and the kit; not yet confirmed with Jennifer.

## Product Purpose
PRISM is "salon marketing in a box": an owner's growth desk for a single salon or med spa. It joins ad spend, leads, bookings and revenue into one set of numbers, says in plain English
whether marketing is paying off, and does the follow-up through two AI helpers, **Joy** (guest-facing: texts, Instagram/Facebook DMs, calls) and **Dash** (owner-facing analyst).
It reads the salon's booking system (Phorest first) and does not replace it. This MVP is a click-through prototype with fictitious data from a fictitious salon, to iterate on the experience.
Success: an owner can see what to do next in under two minutes and every insight ends in a button.

## Positioning
The plain-English growth desk for a single-location salon, joining ad spend to booked revenue (which no booking platform shows) with an AI that does the follow-up, on top of whatever booking
system the salon already uses. Benchmarked against HubSpot, HighLevel, Podium, Birdeye, Apollo-style lead tools, and the booking platforms' AI add-ons, but salon-specific in vocabulary, data and workflow.
See `prism-ai/brain/11-competitive-analysis.md` and `12-uplevel-plan.md`.

## Operating Context
Owner on a phone; desk on a desktop. Pages in scope for the MVP: Home, Leads, Lead record, Clients, Client record, Inbox, Retention, Marketing (incl. ad spend), Bookings (requests, schedule,
appointments), Brand Hub (knowledge base), Joy (settings, sequences), Forms, Reviews, Team, Settings, Connectors. "Phase 2" ideas (Creator, Social Suite, Eye Spy, multi-location) stay out.
Booking data is read-only from the salon's system; writes are explicit, logged actions.

## Capabilities and Constraints
- One number, one meaning: every figure comes from one metrics module following `prism-ai/brain/06-metrics-and-data.md`; global date range with "vs previous period".
- Every insight ends in a button. Consent is checked before any text; hand-offs from Joy carry a plain-English reason; secrets are never shown; destructive actions are undoable.
- No invented benchmarks, prices, customers or commercial claims in the UI. Demonstration data is synthetic and must read as synthetic where it could be mistaken for real.
- Vocabulary: "Needs a person", "Joy is handling", "Went quiet", "Brand Hub", "Bookings", "Ask Dash" (see `brain/05-design-system.md` copy dictionary).
- Undecided: plan ladder and prices, final names (PRISM/Joy/Dash), Phorest API access, Reviews as own page vs Inbox tab (prototype ships its own page).

## Brand Commitments
Brand: Refract teal (Figma PRISM-AI node 12:7, applied 15 Oct 2026; the client's choice). Teal #14A098 (primary, Dash, charts), Tangerine #FF9A4A (the one action on each screen, nile label, hover runs tangerine into teal), Deep Teal #062A2D (ink and dark ground), Paper #F4F2F0 (canvas), Mint #E9FFFB, Teal 800 #0B7E79 (links, accent text), Slate #5B6B6D. Albert Sans Bold for headlines and figures, Albert Sans Regular and Medium for UI and labels. Data colours: teal = the main series, tangerine = comparison or attention, mint = tertiary. Joy has her own colour family, tangerine (client, 15 Oct 2026): her mark is the tangerine spark (`/brand/joy.svg`) on a peach wash #FFF1E5, her accent is ember #C9501A and her text ink #8A3F06, kept deeper than the orange action button so the two never read as the same thing. Dash's mark is the original PRISM six-facet hexagon in teal (`/brand/dash.svg`), on a mint wash in his avatar and in the Ask Dash button. Charts and meters show a rollover tooltip (title, values, a plain-words note) and every list row lights up edge to edge on hover.
Linear is the craft bar (`bar.md`), not the identity.

## Evidence on Hand
`prism-ai/brain/` (product, metrics, competitive analysis, up-level plan), `prism-ai/00-inputs/build-kit-2026-10-10/` (current-app audit, fixtures, 44 screenshots of the old app), the Figma file.
Absent: a real salon dataset, real photos, a logo, live integrations, user research with Jennifer's team.

## Product Principles
1. The next step is always one click away: insight, then button.
2. Speed to lead is the product: waiting time is visible and owned.
3. Plain English first; the jargon (CTR, ROAS, LTV:CAC) lives one click down.
4. Dense where the desk works, calm where the owner decides; both on a phone.
5. Show the AI's work: Joy's actions and reasons are logged and legible, never magic.

## Accessibility & Inclusion
Works at 390px wide and with keyboard only; WCAG AA contrast; 44px touch targets on mobile; reduced-motion respected. Stated by John ("think mobile as well"); standard otherwise assumed.
