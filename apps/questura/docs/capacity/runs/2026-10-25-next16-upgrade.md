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

## Performance gate migration and remaining decision

Next 16 no longer emits the root `app-build-manifest.json`. The old JS gate incorrectly reported that no build existed. A small client Webpack plugin now emits the actual app entrypoint files for the same measurement. It explicitly includes the separate `main-app` runtime; omitting that would falsely report a large reduction. Unit coverage verifies bootstrap inclusion, route deduplication and fail-closed behavior when the bootstrap is missing.

Budgets and baselines have **not** been increased. The accurate Next 16 build currently exceeds the existing JS limits on all 44 measured routes. Representative gzip totals are home 185.9 kB, join 175.7 kB, map article 215.6 kB and itinerary 223.4 kB. The existing cap is 170 kB; over-cap routes are held to their prior baseline plus 1% build noise.

The preceding main run already failed the itinerary JS gate at 194.1 kB against a 194.0 kB limit, and home tap timing at 32 ms against its 24 ms limit. Evidence: https://github.com/Questurian/questura/actions/runs/40193987543

On the upgrade run, home tap timing samples were 40, 40 and 48 ms (median 40 ms); LCP was 1608 ms against 1720 ms, with CLS 0. This is not evidence that the tap limit passes. The framework adds about 30 kB gzip per route relative to current main.

Before merge, either reduce the initial JS to the existing budgets and resolve the tap gate, or explicitly accept a documented performance rebaseline for this framework migration. Do not silently raise caps or suppress these failures.
