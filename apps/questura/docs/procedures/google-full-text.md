# Google's full-text view of paid guides

Decision: [ADR-0009](../adr/0009-lead-in-sampling-for-gated-content.md), revised 2026-11-21.

Verified Googlebot gets the words of a members-only item. Everybody else,
Google's testing tools included, gets the normal preview.

## How it works

1. Next renders and caches the preview, exactly as for a reader.
2. On the way out, `apps/client/cloudflare/worker.js` checks the caller: the
   address must be in `cloudflare/googlebot-ranges.json` **and** the name must
   be Googlebot's (`src/lib/crawler-view/googlebot.ts`).
3. Only then it asks the API for the body
   (`POST /api/internal/crawler-body`, with its own key), puts it in place of
   the `.paywalled` notice, removes the page's scripts and sends it `no-store`.
4. Any failure at any step sends the preview.

## The switch

`QUESTURA_CRAWLER_BODY_KEY`, one random value of 64 characters, on both the
Railway service `questura-server` and the Worker `questura-client`.

**On**, in this order:

1. Set it on Railway and wait for `/api/health/ready`.
2. Check the API alone: without the key it is a 404, with it a published
   members-only path returns `html`.
3. `wrangler secret put QUESTURA_CRAWLER_BODY_KEY` on the Worker.
4. Run the checks below.

**Off:** `wrangler secret delete QUESTURA_CRAWLER_BODY_KEY`. It takes effect
as the new Worker version rolls out, with no build. Removing it from Railway
does the same from the other side. No cache needs clearing: the full text is
never in one.

Text Google has already indexed stays there until it crawls again.

## Checks on live

- An ordinary request, and one with only a Googlebot user agent, carry no
  paid text and keep their normal cache headers.
- A forged `cf-connecting-ip` is refused by Cloudflare (403, error 1000).
- The positive case cannot be tried from outside, which is the point. Use
  Search Console: URL Inspection, then **View crawled page** after Google's
  next crawl. **Test live URL** and the Rich Results Test show the preview on
  purpose: anyone can run those tools.

## Refreshing Google's addresses

```bash
curl -sL https://developers.google.com/static/search/apis/ipranges/googlebot.json \
  -o apps/client/cloudflare/googlebot-ranges.json
```

An out-of-date copy only means some crawls get the preview.

## Never

- Move the body into a page, layout, middleware or render-time fetch. All of
  those are cached and shared.
- Accept the render token or the origin-auth header in place of this key.
  Cloudflare adds the second one to everybody's requests.
- Trust the address without the name, or the name without the address.
