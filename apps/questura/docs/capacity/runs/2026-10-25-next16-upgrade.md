# Next.js 16 upgrade verification — 2026-10-25

PR: https://github.com/Questurian/questura/pull/128

## Functional verification

Client Next.js and ESLint configuration are pinned to 16.4.3. Production continues to use Webpack. The Studio webhook uses immediate tag expiration (`{ expire: 0 }`). The Pages Router 500 page retains its no-JavaScript output after removing obsolete AMP configuration.

The initial upgrade passed 507 client tests, typecheck, lint and the complete Cloudflare Worker build. A local production browser smoke covered seven URLs at desktop and phone widths without horizontal overflow or uncaught errors.

Full CI at ebc2ac7 passed the seven required checks, the non-browser readiness rehearsals, k6 negative controls, and production Cloudflare packaging. The additional browser/measurement failures are detailed below. Failure evidence: https://github.com/Questurian/questura/actions/runs/40220494662

## Error recovery regression

Next 16 delivers the intentionally failed, on-demand Server Component render to `app/error.tsx`, rather than the static Pages Router 500 page. The old app boundary lacked a home link and used different recovery copy. It also needs `retry()` to re-fetch server content, rather than resetting client state alone.

The app boundary now offers readable recovery copy, retry and home, without exposing server details. The outage journey permits only React's expected redacted server-error console message on the deliberately failed URL, then verifies retry after the API recovers. Other browser errors remain failures.

Local production reproduction used a loopback-only proxy to the local API, returning 503 solely for a fresh `upgrade-outage-*` article path. It observed HTTP 500 and the recovery UI, then removed the fault and clicked retry. The page re-fetched and rendered the expected 404 with no uncaught browser errors. No production data or configuration was changed.

After the fixes: 510 client tests pass, typecheck/build pass, lint has no errors (30 existing/new compiler-migration warnings).

## Performance gate migration and optimization

Next 16 no longer emits the root `app-build-manifest.json`. A small client Webpack plugin now emits the actual app entrypoint files for the same measurement. It explicitly includes the separate `main-app` runtime; omitting it would falsely report a large reduction. Unit coverage verifies bootstrap inclusion, route deduplication and fail-closed behavior when the bootstrap is missing.

The first accurate Next 16 build exceeded all 44 route budgets: home 185.9 kB, join 175.7 kB, map article 215.6 kB, itinerary 223.4 kB gzip. The owner selected optimization within the existing limits. Budgets and baselines have **not** changed.

The optimized production build passes all 44 route budgets. Representative gzip totals: home 160.4 kB (170.0 limit), map article 185.7 kB (186.3 limit), itinerary 193.8 kB (194.0 limit). Maps and itineraries remain above the general 170 kB cap, under the existing grandfathered limits.

Changes reduce work actually needed on first load:

- Navigation observes the existing server identity store without loading account/query tools. It shares requests, retains known identity during service failures, clears only on a confirmed anonymous response or 401, and discards responses from previous readers. Server authorization and membership decisions are unchanged.
- Forms, account screens, optional homepage layouts, result lists, tours, embeds and Google rendering load when used. Private screens retain their original business logic and redirects. Anonymous guides still never load Google's JavaScript.
- Listicle headers, bylines and footer links render on the server, passed into interactive layouts as React nodes.
- Public bookmark controls publish write events; the account query cache still invalidates its active/inactive lists after writes without making every public page import React Query.
- Web-vitals observers stream immediately in their own chunk; waiting for idle lost reports when a page was hidden early. Development controls are absent from production. The 404 retains the full site menu and footer: its navigation code is split, its footer renders on the server with document recovery links, and the pure wordmark can render on the server too.

Local verification: 517 client tests pass, typecheck passes, lint has no errors (30 warnings), production build and all 44 JS budgets pass. Browser smoke covers seven URLs at 1440 and 390 pixels with one heading, no horizontal overflow and no uncaught errors. Additional interactions at both widths verify sign-in, menu search, signed-out bookmarks redirect, password-reset fields and no Google Maps JS for anonymous readers. This verification uses the local API, not production membership or Stripe.

## Full CI

The preceding main run already failed itinerary JS at 194.1 kB against a 194.0 kB limit, and home tap timing at 32 ms against 24 ms: https://github.com/Questurian/questura/actions/runs/40193987543

The subsequent recovery-fix run passed the outage/retry journey in both Chromium and Firefox but still failed the JS and timing gates: https://github.com/Questurian/questura/actions/runs/40222859245

Full CI, including throttled timing and production Cloudflare packaging, must pass on the optimized commit before merge. Local browser smoke does not substitute for the sandbox speed measurements.

The optimized run passed all JS budgets and throttled speed limits, including home tap timing at 16 ms, but found six browser failures: four missing-navigation assertions on 404s, one early-hide web-vitals report, and one Firefox navigation cancellation when the membership test left before sign-out's document redirect finished. Evidence: https://github.com/Questurian/questura/actions/runs/40227296951

The recovery fixes preserve the existing assertions. The sign-out helper now waits for the home document to load instead of treating disappearance of the account button as completed navigation. Local regression checks verify eight cold LCP beacons, full 404 navigation/footer/home recovery at desktop and phone widths, and four sign-out redirects with no aborted document requests (server identity/sign-out responses mocked only inside the local browser). The original 517 tests, typecheck, lint and all 44 JS budgets still pass. Full CI must pass again before merge.

The next run passed speed, recovery and all functional browser assertions (88 tests passed), but its console gate found two Firefox-only failures while leaving pages. Both traces show the same passive web-vitals chunk being cancelled, followed by a rejected lazy import reaching the page boundary. Evidence: https://github.com/Questurian/questura/actions/runs/40229270663

The reporter now catches import failures without replacing the reading page; ordinary component/render failures and other resource errors are still checked. A new browser regression aborts only the chunk containing the web-vitals endpoint, asserts that the real page remains visible, and reloads normally. It fails against the preceding production build with the actual ChunkLoadError, then passes against the fix. The existing early-hide LCP beacon test also passes (both focused browser tests passed locally). Build, types, lint, 517 client tests and all 44 unchanged JS budgets pass. Full CI is being rerun before merge.

## Cloudflare runtime failure and correction

Deploy run 40247230580 attempt 2 successfully released the API and reconcile service at de0034b3, but the website's dynamic health route threw Worker error 1101. The exception was `Unexpected loadManifest(/.next/server/preview-props.json) call!`. Cached home output still returned 200, so a cached-page check alone would miss this failure. The website was rolled back to its previous Worker version 4147dfde-4e4f-45a8-85b0-94f31d26be3c, restoring healthy release 32a5f2c. The API remained healthy on de0034b3; there were no schema changes.

OpenNext 1.20.9 did not inline the standalone preview-props manifest introduced by Next 16.4. The published upstream correction is included in OpenNext 1.20.13 (https://github.com/opennextjs/opennextjs-cloudflare/pull/1356). The follow-up pins that adapter and its required Wrangler 4.148.0, retaining Next 16.4.3 and the existing cache configuration.

The new `check:worker-runtime` starts the actual built Worker in local workerd with deployment credentials removed and synthetic runtime bindings. It requires dynamic `/api/health` to return 200 with the supplied release identifier, then checks that unsigned `/api/revalidate` returns 401 without invalidating anything. It fails on the previous bundle with the same manifest exception and passes on the corrected bundle. It now runs after the production bundle in the safety-net workflow and before publishing in the Deploy workflow. Local full OpenNext build, 517 client tests, typecheck, lint (zero errors), and all 44 unchanged JS budgets pass.
