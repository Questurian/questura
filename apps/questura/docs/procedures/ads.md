# Ads (Adsterra banners)

Built 2026-10-17. Off on the live site until unit keys are pasted in. This page
is the switch-on checklist and the rules the code keeps.

## Owner decisions (2026-10-17)

- **Network:** Adsterra.
- **Formats:** display banners only. No popunders, social bar, interstitials or
  native tiles: fixed sizes are what stop an ad from shoving the page around,
  and pop formats do not belong on a paid site.
- **Who sees them:** everyone, members included.
- **Articles and listicles:** placed automatically by rules, never by hand in
  the article editor. **Homepages:** placed by the editor as an **Ad** block.

## Where ads appear

| Page | Placement | Shape | Who decides |
| --- | --- | --- | --- |
| Standard article | after the opening paragraph, then at section breaks (~1 per 250-300 words, max 8) | banner | `features/articles/lib/adPlacement.ts` |
| Article rail (1024px+) | sticky beside the body | rail + rectangle | `ArticleSidebar.tsx` |
| Maps listicle | after the intro, then after every 2nd entry | rectangle | `features/articles/lib/listicleAdPlacement.ts` (`EVERY_N_ITEMS`) |
| Listicle footer | top and bottom of the footer | rectangle, banner | `ListicleArticleFooter.tsx` |
| Article List block, "square images + ad space" | sticky rail beside the list (1024px+) | rail | `ArticleListPreview.tsx` |
| Main, city, Eat/Stay/Itineraries pages | wherever an editor drops an **Ad** block | banner or rectangle | Studio homepage tool |

Shapes, all exact sizes so nothing moves when the ad arrives:

- **banner**: 728x90 where the slot has 728px of room, else 320x50. Measured on
  the slot, not the screen: the reading column beside the rail is under 728px
  on most laptops.
- **rectangle**: 300x250.
- **rail**: 300x250 below 1024px, 160x600 from 1024px.

Density check: a 19-entry listicle carries 10 rectangles (intro + every 2nd
entry). Adsterra may refuse a page it thinks is overloaded; if that happens, cap
`planListicleAds` rather than raising `EVERY_N_ITEMS` site-wide.

## How an ad runs (and why it is a frame)

Every Adsterra banner reads its settings from one global (`atOptions`) and draws
with `document.write`. Straight in the page, a second banner overwrites the
first one's settings, and `document.write` after load wipes the React page.

So each banner gets its own document: `AdsterraFrame` renders an iframe whose
`srcdoc` is built by `adFrameDocument`. The iframe is sandboxed with
`allow-scripts allow-popups allow-popups-to-escape-sandbox` and **without**
`allow-same-origin` or top navigation. Checked in a browser on 2026-10-17:

- unsandboxed, a test script in the frame read the parent page's title and
  `localStorage`, so an ad would see the page and could call the API as the
  signed-in reader;
- sandboxed, the same script loads, `document.write` works, its `atOptions` is
  its own, and the page, storage and cookies all throw.

Do not load an ad network's script into the page itself, and do not add
`allow-same-origin` to make an ad work: that hands it the reader's session.

Not yet proven: that Adsterra's real `invoke.js` serves into a sandboxed frame.
If impressions stay at zero after the keys go in, read the console inside the
frame first. The safe fallback is to serve the frame document from a separate
origin, not to loosen the sandbox.

## Turning ads on

1. In the Adsterra publisher dashboard, add `questurian.com` and wait for
   approval.
2. Create four **Banner** units: 728x90, 320x50, 300x250, 160x600.
3. For each, open **Get code** and copy the `key` from its `atOptions`. Paste
   them into `UNIT_KEYS` in `apps/client/src/features/ads/lib/adUnits.ts`. Keys
   are not secrets: every visitor's browser sees them.
4. In the same snippet, check the script address. If it is not
   `https://www.highperformanceformat.com`, change `ADSTERRA_SCRIPT_ORIGIN`.
   The CSP reads it from there.
5. Privacy page: the advertising paragraph and the new opening line appear by
   themselves once a key is in (`ADS_LIVE`). Bump its "Last updated" date in
   the same PR.
6. **Owner call before switching on:** visitors from the EU and UK may need to
   agree to Adsterra's cookies first. Nothing in the site asks today.
7. Merge to `main`; the deploy ships it.
8. On the real domain: open an article, a Maps listicle and a city page with an
   Ad block. Each slot should hold a creative. Check the console for
   `Content-Security-Policy-Report-Only` lines from ad hosts and add them to
   `securityHeaders.ts` before the policy is ever enforced: a `srcdoc` frame
   inherits the page's CSP, so enforcing it without those hosts blanks every ad.
9. Next day: Adsterra's statistics should show impressions for each unit.

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
