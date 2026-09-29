# The website builds each article's structured data at render

*2026-09-29. Owner-approved plan: "Questurian Structured Data Plan"
(https://claude.ai/artifact/Q5Ddvjk685aW9MKAWSdMyE). Built in PRs #22–#24 here
and Questurian/questurian-studio #12–#14.*

## Context

Google reads a page's JSON-LD to learn what it is: its address, author,
dates, picture, and whether it is paid. For standard articles and itineraries
that label used to be written once by the studio's step 4, at publish, and
stored in `seoSection.structuredData`. The site printed it as stored.

It could not be right. The public address includes the category
(`/country/city/<category>/<slug>`), which was set later in Payload, so the
studio guessed from its og:url box: 8 of 18 live articles said `example.com`
and the other 10 had no address. Nothing refreshed it after an edit, so the
author and dates went stale. The site then added its own paywall `Article`
node on paid pages, leaving two article entries that disagreed. Measured
2026-09-29 with `pnpm --dir apps/questura/apps/client check:structured-data`:
0 of 21 pages passed.

## Decision

The site builds the label on every render from the article as Payload holds
it now (`features/articles/lib/articleJsonLd.ts`): one `@graph` with the
`WebPage`, a `BlogPosting`, the place and the breadcrumb, linked by `@id`.
The address comes from `canonicalPath`, the author is a `Person` linked to
`/authors/<slug>`, the dates are Payload's, the pictures are the featured
MediaSet's 16:9, 4:3 and 1:1 crops, and a paid page carries
`isAccessibleForFree: false` with a **class** selector (`.paywalled`) on that
same entry.

`seoSection.structuredData` is ignored for these pages and left in the
database (not deleted, so undoing this is a code revert). The studio no
longer writes it or og:url. Map listicles still print their stored label;
their labels were healthy and are out of scope.

Bylines are real people: an admin or editor may name the author on create
(`bylineOnCreate`), and the studio does from a step 1 picker. The 28 items
credited to the studio's login were moved to Alan Malpartida with
`pnpm reassign:bylines`.

## Consequences

- Editing an article in Payload updates its label once the page refreshes.
  Changing the slug, category or location changes the address; Payload
  already adds the redirect.
- Do not put a label back in the studio. Anything it writes goes stale.
- `scripts/check-structured-data.mjs` is the measure, and
  `.github/workflows/questura-structured-data-check.yml` runs it daily against
  the live site. After this shipped: 21 of 21 pass.
- `PaywallNotice` must keep both the `paywalled` class (the JSON-LD points at
  it) and `data-paywalled` (the check, e2e specs and readiness harness use it).
