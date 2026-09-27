# Questura

The Questurian website and its API.

- `apps/questura/apps/client`: Next.js website, deployed as the Cloudflare Worker on www.questurian.com
- `apps/questura/apps/server`: Payload CMS API, deployed on Railway at api.questurian.com
- `apps/questura/apps/e2e`: Playwright journeys

```bash
pnpm install
pnpm dev          # client on :3000, server on :4000
```

Deploys, scheduled jobs and procedures: `apps/questura/docs/`.
