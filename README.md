# prism-ai-insight

AI-powered business intelligence and automation platform for salon owners.

PRISM 2.0 app prototype (Astro, static output), live at https://app.prismaiinsight.com via the Vercel project `prism-app`. Pushes to `main` deploy to production.

Fictitious salon "Marlow & Finch, Evanston IL". All data is seeded and fake (`src/data/`), "now" is fixed at Sat 10 Oct 2026 9:41 am.

    npm install
    npm run dev        # http://localhost:4321
    npm run build      # static site in dist/
    npm run shoot      # screenshots, see scripts/shoot.mjs

Pages: Home, Leads (+ record), Inbox, Clients (+ record), Retention, Marketing (incl. ad spend), Reviews, Bookings, Brand Hub, Forms, Joy, Team, Connectors, Settings.
Keys: ⌘K palette, ⌘J Ask Dash, `g` then a letter to jump.
Design bar: Linear (see `bar.md`). Context: `PRODUCT.md`.

`/waitlist` and `/presale` post to Netlify Forms, which Vercel does not process. Collect sign-ups on the marketing site, not here.
