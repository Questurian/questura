# PL3 on the live platform: journey climb from one Mac — 26 September 2026

The first load test against the real hosting (launch fix plan PL3, owner
present). Site live but not announced.

## Setup

| | |
|---|---|
| Release | API `167b457` (Railway `questura-server`, us-east4, 1 replica, `APP_PROCESS_COUNT=1`); website Worker `questura-client` as deployed 2026-09-26 |
| Database | Neon Postgres 17 (0.25–1 CU) |
| Front | Cloudflare **Free** plan, managed rules only (no rate-limit rules) |
| Generator | the owner's Mac (M1, 8 cores, 16 GB) on home internet (~220 Mbit/s down), k6 v2.3.0 under `supervise.mjs` |
| Load identity | window opened for the run, closed after; `launch:verify` 49/49 afterwards, including "no load-test key" |
| Workload | anonymous only (`SIGNED_IN_SHARE=0 WRITE_RATE=0 SIGNIN_RATE=0`): 40 live pages from the sitemap, 2 gated articles, 2 searches. Built from the live sitemap and a read-only Neon query. **Kept out of the repo**: its privacy markers are sentences from members-only bodies |
| Journey mix | free landing (page + `/api/me` + refs), gated reader (page + `/api/me`, 20% also probe the member body), repeat visit, search |
| Profile | `STAGES` 10 → 40 → 80 → 160 → 320 → 640 → 1000 journeys/s, 30 s ramp + 90 s hold each |
| Stops | >1% failures over 60 s; any correctness fault; queue ≥100 for 30 s; >50 dropped arrivals; Railway month-to-date ≥ $4 |

No signed-in traffic: the live site has no synthetic accounts and none may be
created. Signed-in paths remain proven only in the sandbox
(`2026-09-25-post-upgrade-baseline.md`).

## Results

**Run 2 (the result).** 528 s, 92,324 requests, 91,996 successful, 0 refusals,
0 correctness faults.

- **Clean through the 160 journeys/s hold** (~400 req/s). An ordinary page
  fetched from outside the run during that hold: TTFB 0.2–0.6 s, the same as
  idle.
- **Stopped at ~9 min, ramping 160 → 320**: 224 failures in the last 60 s
  (1.00%). **All 328 failures of the run were `read: connection reset by
  peer`** between the Mac and Cloudflare (298 on www, 30 on api).
- **Nothing behind Cloudflare was under pressure at the stop:**
  - Worker: 0 errors every minute; CPU p50 ~9 ms throughout. Wall time p50
    rose from ~0.1 s to 1.2 s (p99 5.8 s) only in the minute it served
    ~190 pages/s.
  - API (`/api/internal/db-stats` every 2 s): ready throughout, Payload pool
    1 in use of 3–13, 0 waiting, no admission-gate queueing, Redis breaker
    closed. No API errors in the log; 0 new Sentry issues.
  - Generator: k6 at ~25–80% of one core; 2,615 dropped arrivals overall.
- Latency (successful requests, whole run): page TTFB med 177 ms, p95 2.8 s;
  dynamic med 67 ms, p95 222 ms.

**Reading:** the ceiling measured here is the single generator's connections
through Cloudflare, not the platform: connection resets with every server
idle, Worker CPU flat, API pools unused. It cannot say whether Cloudflare
limited one address or the home router ran out of connection state. Real
readers arrive from many addresses. The platform ceiling is **above ~250
journeys/s and not measured**; finding it needs a generator in a data centre.

**Run 1** stopped after 431 s at the same ramp (53,228 requests, 20 failures)
on a harness false positive: one failed `/api/me` with no `no-store` header
was scored as a `cache_policy` leak. Fixed in `lib/requests.js`.

**Cost:** Railway month-to-date read $0.94 before and after (it may lag).
Cloudflare: ~150,000 Worker requests, inside the plan's included 10M.

## Findings

1. **Pages start slowly even idle** (TTFB 0.4–1.4 s on a quiet site before
   the run; the API answers in ~0.1 s), and they barely use Cloudflare's
   cache: most pages send `s-maxage=2`; `/peru/lima/itineraries` sent no
   `Cache-Control`; `/peru/lima/articles` sent `s-maxage=3600` on one fetch
   and none on another (728 landing responses in run 2 were not publicly
   cacheable). No `cf-cache-status` on any page. The biggest lever before
   announcing.
2. **The load identity's per-request log line hits Railway's log rate limit**
   ("Messages dropped: 532" during run 1). During a test that coincides with a
   real incident, the real error lines would be dropped too.
3. **Real Cloudflare refuses a request that carries its own
   `CF-Connecting-IP`** (error 1000) before the Worker or API. The sandbox edge
   only overwrote it. `THROUGH_CLOUDFLARE=1` now leaves it out.
4. The burst (1,000 arrivals at once) was not run: from one machine it would
   meet the same connection limit, not the platform's.

## Commands

The window and runner scripts live in the owner's vault
(`~/.questura-vault/phase3/loadtest/`): `window.sh --open|--close|--status`,
`run.sh smoke|climb|burst`. Environment the runner sets for k6:

```
THROUGH_CLOUDFLARE=1 WORKLOAD=<live workload> SIGNED_IN_SHARE=0 WRITE_RATE=0 SIGNIN_RATE=0
STAGES=10:30s,10:90s,40:30s,40:90s,80:30s,80:90s,160:30s,160:90s,320:30s,320:90s,640:30s,640:90s,1000:30s,1000:90s
MAX_VUS=3000 PRE_VUS=200
TELEMETRY_INSTANCES=<live instance id>=https://api.questurian.com/api/internal/db-stats TELEMETRY_INTERVAL_MS=2000 ABORT_TELEMETRY_GAP_MS=30000
ABORT_QUEUE_MIN=100 ABORT_QUEUE_SUSTAIN_MS=30000 ABORT_DROPPED_MAX=50
node supervise.mjs launch-journeys.js
```

The supervisor declares one instance by the id `db-stats` reports; the id
changes on every deploy, so read it at start.
