# Reader journeys: how far each US reader gets toward membership

*2026-11-22. Owner-approved from a clickable mockup.*

## Context

Cloudflare Web Analytics counts page loads. It cannot say how long a page was
on screen, whether a reader saw the paywall or the prices, or which steps one
person took. The owner needs exactly that to learn where readers stop before
buying. The privacy page said the site ran no tracking scripts, so the page
changes in the same deploy.

## Decision

- **First party.** Our own small recorder, our own API, our own database. No
  vendor script, no screen replay, no fingerprinting.
- **US readers only.** `GET /api/journey/where` on the Worker reads
  Cloudflare's country for the connection and answers no for everyone else,
  for server networks, and for Global Privacy Control / Do Not Track. Nothing
  is sent and no id is written unless it said yes. The API looks again.
- **What is kept:** one `journey_viewers` row per browser (random id,
  approximate city and state, OS, browser, device, language, first source,
  the account id once signed in) and one `journey_views` row per page view
  (path without its query, seconds on screen, furthest scroll, up to 100
  events: sections, paywall and prices with seconds, taps, box selected,
  checkout).
- **What is never kept:** IP address, user agent, query strings, anything
  typed, labels from the reader's own account pages, labels holding an email
  address. Taps outside the page's content keep only a fixed list of names.
- **Time on screen** stops when the page is hidden and after two minutes
  without a scroll, tap or key.
- **Off switch** on the privacy page deletes the browser's record. Account
  erasure deletes linked journeys. The server deletes page views at 90 days.
- **Staff are left out:** a browser with a studio login is not recorded.
- **Plain tables, not collections:** no REST surface and no admin screen. The
  owner's dashboard reads them with the read-only database login. The tables
  are PRIVATE to `db:refresh`.
- **Passive.** The recorder is a lazy chunk, reports every 3 seconds for a
  view's first half minute and every 10 after, plus on leaving, is capped per address and in total, writes at most four reports
  at once, and drops what is over, by the minute and by the day.

## Consequences

- The reports are anonymous-writable, so they can be forged. They are for
  learning, never for access, money or anything automatic.
- Instagram's browser and Safari are two viewers until the reader signs in.
- A new field or event kind needs the privacy page changed with it.
- To switch it off: remove `<Journey />` from the root layout and change the
  privacy page.
