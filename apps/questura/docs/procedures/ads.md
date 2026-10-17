# Ads (Adsterra banners)

Built 2026-10-17; keys wired in the same day (go-live PR). This page is how
ads work, the rules the code keeps, and what to check.

## Owner decisions (2026-10-17)

- **Network:** Adsterra.
- **Formats:** display banners only. No popunders, social bar, interstitials or
  native tiles: fixed sizes are what stop an ad from shoving the page around,
  and pop formats do not belong on a paid site.
- **Who sees them:** everyone, members included. Visitors in the EU, EEA, UK
  and Switzerland are asked first (see "Consent" below).
- **Listicles:** at most 6 ads in the list (`MAX_LISTICLE_ADS`).
- **Articles and listicles:** placed automatically by rules, never by hand in
  the article editor. **Homepages:** placed by the editor as an **Ad** block.

## Where ads appear

| Page | Placement | Shape | Who decides |
| --- | --- | --- | --- |
| Standard article | after the opening paragraph, then at section breaks (~1 per 250-300 words, max 8) | banner | `features/articles/lib/adPlacement.ts` |
| Article rail (1024px+) | sticky beside the body | rail + rectangle | `ArticleSidebar.tsx` |
| Maps listicle | after the intro, then after every 2nd entry, at most 6; a long list widens the gap so ads still reach the end | rectangle | `features/articles/lib/listicleAdPlacement.ts` (`EVERY_N_ITEMS`, `MAX_LISTICLE_ADS`) |
| Listicle footer | top and bottom of the footer | rectangle, banner | `ListicleArticleFooter.tsx` |
| Article List block, "square images + ad space" | sticky rail beside the list (1024px+) | rail | `ArticleListPreview.tsx` |
| Main, city, Eat/Stay/Itineraries pages | wherever an editor drops an **Ad** block | banner or rectangle | Studio homepage tool |

Shapes, all exact sizes so nothing moves when the ad arrives:

- **banner**: 728x90 where the slot has 728px of room, else 320x50. Measured on
  the slot, not the screen: the reading column beside the rail is under 728px
  on most laptops.
- **rectangle**: 300x250.
- **rail**: 300x250 below 1024px, 160x600 from 1024px.

Density: a 19-entry listicle carries 5 rectangles in the list (intro + every
4th entry) plus the footer's 2. Twelve entries is the most that keeps the
every-2nd cadence and still fits 6.

## How an ad runs: ads.questurian.com

Every Adsterra banner reads its settings from one global (`atOptions`) and draws
with `document.write`. Straight in the page, a second banner overwrites the
first one's settings, and `document.write` after load wipes the React page. So
each banner gets a document of its own, in an iframe.

Where that document comes from matters. Checked in a browser on 2026-10-17:

- **On the site's own origin** (`srcdoc` without a sandbox, or any page of
  ours): Adsterra works, and a test script in the frame read the page title and
  `localStorage`. An ad there could read pages and use the reader's session.
- **Sandboxed with no origin** (no `allow-same-origin`): the page, storage and
  cookies are all out of reach, and Adsterra's script fails ("Script error.",
  no ad). It needs storage of its own.
- **On a separate origin** (what runs): `AdsterraFrame` loads
  `https://ads.questurian.com/frame?k=<key>&w=<w>&h=<h>`, sandboxed with
  `allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox`.
  "Same origin" there means ads.questurian.com, so Adsterra gets its own storage
  and the page stays out of reach (checked: `parent.document` throws).

The origin is the `questura-ad-frame` Cloudflare Worker
(`apps/client/ad-frame/`, logic in `src/features/ads/lib/adFrameResponse.ts`):

- `GET /frame` answers only the four sizes the site uses and a well-formed key,
  with `frame-ancestors` limited to the site (and localhost:3000 for dev), and
  `Cache-Control: no-transform` so Cloudflare does not inject its analytics
  beacon (every ad would otherwise count as a page view).
- `GET /region` answers `{ consentRequired }` from Cloudflare's country lookup,
  never cached, readable only by the site.
- Everything else is 404.

Deploy it by hand when `adFrameResponse.ts`, `adFrameDocument.ts` or
`ADSTERRA_SCRIPT_ORIGIN` changes (the site's deploy does not touch it), with
the Cloudflare setup token from the vault:

```bash
cd apps/questura/apps/client
CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=… pnpm exec wrangler deploy --config ad-frame/wrangler.jsonc
```

**The API guard.** ads.questurian.com is a sibling subdomain, so it is the same
*site* as api.questurian.com and the reader's `SameSite=Lax` cookies would ride
along on requests its code sends. The API refuses any write (POST, PUT, PATCH,
DELETE) whose `Origin` is a questurian.com address that is not one of the site's
own origins (`apps/server/src/shared/http/same-site-origin.ts`, in `proxy.ts`).
Keep it, and keep ad code off every other origin of ours.

Never put an ad network's script in the site's own pages, and never add
`allow-same-origin` to a frame whose document is the site's own.

## Consent (EU, EEA, UK, Switzerland)

Owner decision 2026-10-17: ask these visitors first. `src/features/ads/lib/adConsent.ts`:

- The page asks `ads.questurian.com/region` once per browser session. Unknown or
  anonymised countries are asked too, and so is everyone when the check fails.
- A visitor who must be asked sees a bar at the bottom (`AdConsentBanner`):
  **Allow ads** or **No thanks**, nothing pre-chosen. No ad frame loads before
  an answer.
- The answer is kept in `localStorage` (`qv-ad-consent`). A "no" also marks
  `<html data-ad-consent="denied">` before first paint, and CSS hides every
  `[data-ad-slot]`, so no empty slot flashes in.
- The privacy page's Advertising section changes the answer (`AdChoice`), for
  anyone.
- In development, `?adcountry=FR` on any page shows the bar.

## The Adsterra account and keys

Done once on 2026-10-17. Run the wizard again to change a unit, add the
stats token, or start on a new account.

### Owner: run the wizard

```bash
bash apps/questura/infra/ads/setup-ads.sh
```

It opens each Adsterra page, says what to click, and saves what you paste to
`~/.questura-vault/owner.env`. Nothing is printed back. Stop any time
(Ctrl-C, or just close the terminal) and run the same command again: it shows
which stages are done and carries on from the first one that isn't. You can
also redo any one stage, or start over and keep what you already saved (Enter
keeps each value). Progress is kept in `~/.questura-vault/ads-progress`.

| # | Stage | What you do | Saved as |
| --- | --- | --- | --- |
| 1 | Account | Sign up at Adsterra as a **Publisher** and confirm the email. Accepting their Terms is your call. | — |
| 2 | Website | Websites → ADD WEBSITE → `https://www.questurian.com`, category Travel (or closest), **BOOST CPM off**, format Banner. Then wait for **Approved**: the wizard pauses here and picks up when you run it again. | — |
| 3-6 | Banner units | For each of 728x90, 320x50, 300x250 and 160x600: the **+** on the questurian.com row → **Banner** (not Native Banner, Popunder or Social Bar) → that size. Then **Get code** → copy all of that unit's code → paste. The wizard checks the size and refuses a non-banner code. | `ADSTERRA_KEY_728X90`, `ADSTERRA_KEY_320X50`, `ADSTERRA_KEY_300X250`, `ADSTERRA_KEY_160X600`, `ADSTERRA_SCRIPT_ORIGIN` |
| 7 | Stats token (optional) | Settings → API → GENERATE NEW TOKEN, copied straight away (Adsterra hides it after a reload). Read-only: impressions and earnings. The wizard checks it with Adsterra before saving. | `ADSTERRA_API_TOKEN` (secret) |
| 8 | Decisions | EU/UK consent (ask first / no prompt / decide later) and the most ads on one listicle (6 suggested, 0 = no limit). | `ADS_EU_CONSENT`, `ADS_LISTICLE_CAP` |
| 9 | Refresh login | Runs `pnpm db:refresh:setup`, so the Mac's content copy can read the ad table. | — |
| 10 | Hand off | Lists what is saved. Then tell Claude "the ads wizard is done". | — |

### Claude: after "the ads wizard is done"

Read the names above from `~/.questura-vault/owner.env`, inside a script and
never printed.

1. Check each key's script really loads: `GET
   https://www.highperformanceformat.com/<key>/invoke.js` with a browser
   user agent answers ~55 KB of JavaScript that contains the key. A host that
   404s for the key is the wrong one (2026-10-17: the Popunder unit's
   `bauval.org` got saved; the wizard now reads the host only from a banner's
   `invoke.js` line).
2. Put the keys into `UNIT_KEYS` and the host into `ADSTERRA_SCRIPT_ORIGIN` in
   `apps/client/src/features/ads/lib/adUnits.ts` (keys are public, so they are
   committed). A host change also needs the ad frame Worker redeployed.
3. Apply `ADS_LISTICLE_CAP` to `MAX_LISTICLE_ADS` and `ADS_EU_CONSENT` to the
   consent rules (`ask` is what is built).
4. Open the PR. Merging to `main` ships it.

### After it ships

1. On the real domain, in a real browser (Adsterra serves nothing to automated
   browsers or to localhost): an article, a Maps listicle and a city page with
   an Ad block. Each slot should hold a creative within a few seconds.
2. The stats token answers per-unit impressions
   (`GET https://api3.adsterratools.com/publisher/stats.json`, header
   `X-API-Key`, `group_by=placement`). Impressions should appear within a day.
3. If slots stay blank on the live site, the likeliest cause is Adsterra not
   counting ads.questurian.com as the approved domain: add it in Adsterra as a
   site, or ask their support, before changing any code.

A shape is live only when **every** unit it uses has a key, so a banner with
only the 728x90 key draws nothing (rather than a gap on phones).

## Local development

With no keys, `pnpm dev` draws a dashed outline with the size in every slot, so
placements can be seen. `NEXT_PUBLIC_AD_PREVIEW=0` turns that off. A production
build (and the live site) draws nothing where there is no key.

## The Ad block (homepages)

Studio → homepage tool → Add block → **Ads** → **Ad**. Pick Banner or Rectangle;
drag it into place. It holds no items and has nothing to publish-check, so it
never blocks a publish. Editors can place Ad blocks before the keys exist: the
public page draws nothing for them until then.

Server: `apps/server/src/features/homepage-featured-content/ad-slot/` (field
`adSize`, migration `20261017_045410_homepage_ad_slot_block`). Client:
`CityDashboard/components/blocks/ad-slot/AdSlotPreview.tsx`. Studio:
`AdSlotBlockEditor.tsx` in `questurian-studio`.

After the migration is live, run `pnpm db:refresh:setup` once from
`apps/server` so the Mac's content refresh can read the new
`location_homepages_blocks_ad_slot` table.
