import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { LastGood } from '../../../lib/cache/lastGood.ts';
import { isLocalJoinPreview, readJoinPricing } from './joinPlans.ts';

// A fresh fallback store per call, so one test's good answer never rescues another's failure.
const read = (url, preview, request, store = new LastGood(1)) => readJoinPricing(url, preview, request, store);

test('preview is restricted to explicitly configured loopback frontend origins', () => {
  for (const url of ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://[::1]:3000']) {
    assert.equal(isLocalJoinPreview(url), true);
  }
  for (const url of ['', 'invalid', 'https://www.questurian.com', 'https://localhost.example.com']) {
    assert.equal(isLocalJoinPreview(url), false);
  }
});

test('local preview needs no backend and carries no checkout price IDs', async () => {
  const { plans, taxAtCheckout } = await read('http://localhost:4000', true, () => {
    assert.fail('local preview must never request payment availability');
  });
  assert.equal(taxAtCheckout, false);
  assert.deepEqual(plans.map(({ id, amount, priceId }) => ({ id, amount, priceId })), [
    { id: 'monthly', amount: 1299, priceId: '' },
    { id: 'yearly', amount: 7999, priceId: '' },
  ]);
});

test('deployed join preserves backend availability and bounds the public read', async () => {
  const offered = [{ id: 'monthly', amount: 1299 }];
  const { plans } = await read('https://api.example.com', false, async (url, options) => {
    assert.equal(url, 'https://api.example.com/api/payments/plans');
    assert.equal(options.credentials, undefined);
    assert.equal(options.next.revalidate, 60);
    assert.ok(options.signal instanceof AbortSignal);
    return Response.json({ plans: offered });
  });
  assert.deepEqual(plans, offered);
});

// A 200 that says the list is empty is the server's real answer.
test('an empty plan list from the server renders as empty', async () => {
  assert.deepEqual(await read('https://api.example.com', false, async () => Response.json({ plans: [] })), {
    plans: [],
    taxAtCheckout: false,
  });
});

// 2026-09-26: a 429 rendered "Memberships are temporarily unavailable" and
// that page was cached for 60 s. A failed read must fail the render (Next then
// keeps the last good page) and never invent plans, fixture or empty.
test('rate-limited, unavailable and malformed reads throw instead of rendering nothing for sale', async () => {
  for (const request of [
    async () => Response.json({ message: 'Too many requests' }, { status: 429 }),
    async () => Response.json({}, { status: 503 }),
    async () => Response.json({ plans: null }),
    async () => Response.json({}),
    async () => { throw new Error('offline'); },
  ]) await assert.rejects(read('https://api.example.com', false, request));
});

test('a failed read serves the last good plans this process saw', async () => {
  const store = new LastGood(1);
  const offered = [{ id: 'monthly', amount: 1299 }];
  await read('https://api.example.com', false, async () => Response.json({ plans: offered, taxAtCheckout: true }), store);
  const pricing = await read(
    'https://api.example.com',
    false,
    async () => Response.json({}, { status: 429 }),
    store,
  );
  assert.deepEqual(pricing, { plans: offered, taxAtCheckout: true });
});

// Every other server-side read sends the render token; this one did not, so
// every Worker render of /join shared one per-IP rate budget.
test('the plans read sends the render headers', async () => {
  const saved = { token: process.env.QUESTURA_RENDER_TOKEN, origin: process.env.ORIGIN_AUTH_SECRET };
  process.env.QUESTURA_RENDER_TOKEN = 'render-token-for-test';
  process.env.ORIGIN_AUTH_SECRET = 'origin-secret-for-test';
  try {
    await read('https://api.example.com', false, async (_url, options) => {
      assert.equal(options.headers['x-questura-render-token'], 'render-token-for-test');
      assert.equal(options.headers['x-questura-origin-auth'], 'origin-secret-for-test');
      assert.equal(options.headers.Accept, 'application/json');
      return Response.json({ plans: [] });
    });
  } finally {
    for (const [name, value] of [['QUESTURA_RENDER_TOKEN', saved.token], ['ORIGIN_AUTH_SECRET', saved.origin]]) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});

// Checkout adds tax only while Stripe Managed Payments is on, and the server
// says so. Anything short of an explicit true makes no tax promise.
test('the tax promise follows the server, and defaults to none', async () => {
  const offered = [{ id: 'monthly', amount: 1299 }];
  for (const [taxAtCheckout, expected] of [[true, true], [false, false], [undefined, false], ['true', false], [1, false]]) {
    const pricing = await read('https://api.example.com', false, async () =>
      Response.json({ plans: offered, taxAtCheckout }),
    );
    assert.deepEqual(pricing, { plans: offered, taxAtCheckout: expected }, String(taxAtCheckout));
  }
});

test('hero visibility no longer depends on image decode or hydration', () => {
  const css = readFileSync(new URL('../../../app/styles/global/membership.css', import.meta.url), 'utf8');
  const hero = readFileSync(new URL('../components/JoinHeroVisual.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(css, /data-join-hero-ready|join-hero-copy-reveal|join-hero-visual-enter/);
  assert.doesNotMatch(hero, /JoinHeroReady|heroReadyScript/);
});
