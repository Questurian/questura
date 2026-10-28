# Ads

**Status (2026-10-17): no ad network runs.** The ad spaces, their placement
rules and the homepage Ad block exist, but nothing draws on the live site until
a network is wired in. Adsterra ran for a few hours on 2026-10-17 and was
removed the same day. Google AdSense is the next candidate.

## Owner decisions (2026-10-17)

- **Formats:** display banners only. No popunders, social bar, interstitials or
  native tiles: fixed sizes are what stop an ad from shoving the page around,
  and pop formats do not belong on a paid site.
- **Who sees them:** everyone, members included.
- **Articles and listicles:** placed automatically by rules, never by hand in
  the article editor. **Homepages:** placed by the editor as an **Ad** block.
- **Listicles:** at most 6 ads in the list.
- **EU, EEA, UK, Switzerland:** visitors are asked before any ad loads.
- **Ad control:** the owner must be able to block categories (gambling, adult,
  dating) and single ads themselves. This is why Adsterra went.

## What exists (network-neutral)

| Page | Placement | Shape | Where |
| --- | --- | --- | --- |
| Standard article | after the opening paragraph, then at section breaks (~1 per 250-300 words, max 8) | banner | `features/articles/lib/adPlacement.ts` |
| Article rail (1024px+) | sticky beside the body | rail + rectangle | `ArticleSidebar.tsx` |
| Maps listicle | after the intro, then every 2nd entry, at most 6; a long list widens the gap so ads still reach the end | rectangle | `features/articles/lib/listicleAdPlacement.ts` |
| Listicle footer | top and bottom of the footer (not counted in the 6) | rectangle, banner | `ListicleArticleFooter.tsx` |
| Article List block, "square images + ad space" | sticky rail beside the list (1024px+) | rail | `ArticleListPreview.tsx` |
| Main, city, Eat/Stay/Itineraries pages | wherever an editor drops an **Ad** block | banner or rectangle | Studio homepage tool; server `homepage-featured-content/ad-slot/` |

Shapes (`features/ads/lib/adUnits.ts`), exact sizes so nothing moves when an ad
arrives:

- **banner**: 728x90 where the slot has 728px of room, else 320x50. Measured on
  the slot, not the screen: the reading column beside the rail is under 728px
  on most laptops.
- **rectangle**: 300x250.
- **rail**: 300x250 below 1024px, 160x600 from 1024px.

`AdSurface` reserves each box in the server HTML. `ADS_LIVE` is `false`, so on
the live site every slot (and its "Advertisement" label) draws nothing, and
so does `pnpm dev` (owner's call, 2026-10-27: no outlines anywhere until
AdSense approves). `NEXT_PUBLIC_AD_PREVIEW=1` in `apps/client/.env.local`
draws a dashed outline naming each slot's size, to check placements.

## What Adsterra taught us (keep for the next network)

- **Banner code that uses `document.write` and a page global** (`atOptions`)
  cannot run straight in a React page: a second banner overwrites the first's
  settings and a late `document.write` wipes the page. Each slot needs its own
  document (an iframe).
- **A fully sandboxed iframe (no `allow-same-origin`) breaks ad code** that
  needs storage ("Script error.", no ad). An iframe on the site's own origin
  hands the ad the page and the reader's session (checked: a test script read
  the page and `localStorage`). What worked: the frame document served from a
  separate origin (ads.questurian.com, a small Cloudflare Worker), so the ad
  gets storage of its own and never the site's.
- **A sibling subdomain is the same site**, so the reader's `SameSite=Lax`
  cookies ride along on requests its code sends. The API now refuses writes
  from questurian.com subdomains that are not the site
  (`apps/server/src/shared/http/same-site-origin.ts`). It stays.
- **Cloudflare injects its Web Analytics beacon** into HTML a Worker serves
  unless the response says `Cache-Control: no-transform`. Without it every ad
  frame counted as a visitor on the dashboard.
- **Ad networks serve nothing to automated browsers or to localhost.** A real
  fill can only be checked on the live domain in a real browser.
- **No self-serve control over what showed.** One page load gave a casino ad
  and a fake "You have (1) New Message!" banner. Blocking categories meant
  asking Adsterra support.

The Adsterra code (frame Worker, consent bar, setup wizard) is in git history:
PR #112 ("Ads go live") and PR #111.

## Next: Google AdSense

Why: no traffic minimum (approval is on content and policy), and the owner
blocks categories, advertisers and single ads themselves (Blocking controls,
Ad review center).

What the switch needs:

1. The owner applies with their Google account. Google gives a publisher ID and
   a site-verification snippet; the site must stay reachable for review (days
   to a few weeks). Google also checks for a privacy page and a way to make
   contact.
2. **Consent:** for EEA/UK/Swiss traffic Google requires a Google-certified
   consent platform (its own free "Privacy & messaging" message qualifies).
   That replaces a home-built bar.
3. **Wiring:** AdSense runs its own script on the page and fills `<ins>` slots;
   check Google's placement rules before putting AdSense in iframes. Mount the
   network's slot component inside `AdSurface`'s box, keep the sizes, and set
   `ADS_LIVE` when it serves.
4. **CSP:** add Google's ad hosts to the report-only policy
   (`apps/client/src/lib/http/securityHeaders.ts`) and read the violations
   from live before ever enforcing it.
5. **Privacy page:** rewrite the opening line and add an Advertising section in
   the same deploy, and bump "Last updated".
