/**
 * Move bylines from one Author to another, on articles, itineraries and map
 * listicles.
 *
 * Why: the studio signed in as "Service Account" and Payload credited that
 * login on everything the studio published. It showed as the public byline,
 * had its own author page, and went into Google's label. The studio now names
 * the real writer (bylineOnCreate); this fixes what was already published.
 *
 * Dry by default: prints every item it would change and exits. `--apply`
 * writes through the Local API, so the collection hooks run exactly as for an
 * edit in the admin: public pages are revalidated, and the old author's page
 * disappears once they have nothing published (authorVisibility.ts).
 *
 *   pnpm reassign:bylines --from service-account --to alan-malpartida           # report
 *   pnpm reassign:bylines --from service-account --to alan-malpartida --apply   # write
 *
 * Reversal is the same command with --from and --to swapped, limited to the
 * ids this one printed (`--ids 12,14`). Each item's "Last updated" date moves
 * to the run, since the byline really changed.
 */
import 'dotenv/config'
import { getPayload, type CollectionSlug } from 'payload'

import config from '../src/payload.config'

const COLLECTIONS = ['articles', 'listicle-itineraries', 'single-type-listicles'] as const

type Args = { from: string; to: string; apply: boolean; ids: Set<string> | null }

function parseArgs(argv: string[]): Args {
  const value = (flag: string) => {
    const index = argv.indexOf(flag)
    return index >= 0 ? argv[index + 1] : undefined
  }
  const from = value('--from')
  const to = value('--to')
  if (!from || !to) throw new Error('Usage: --from <author-slug> --to <author-slug> [--ids 1,2] [--apply]')
  if (from === to) throw new Error('--from and --to are the same author')
  const idList = value('--ids')
  return {
    from,
    to,
    apply: argv.includes('--apply'),
    ids: idList ? new Set(idList.split(',').map((id) => id.trim()).filter(Boolean)) : null,
  }
}

async function authorBySlug(payload: Awaited<ReturnType<typeof getPayload>>, slug: string) {
  const found = await payload.find({
    collection: 'authors',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const author = found.docs[0]
  if (!author) throw new Error(`No author with slug "${slug}"`)
  return author as { id: number; displayName: string }
}

async function main() {
  const { from, to, apply, ids } = parseArgs(process.argv.slice(2))
  const payload = await getPayload({ config })
  const fromAuthor = await authorBySlug(payload, from)
  const toAuthor = await authorBySlug(payload, to)

  console.log(`from: ${fromAuthor.displayName} (#${fromAuthor.id})`)
  console.log(`to:   ${toAuthor.displayName} (#${toAuthor.id})`)

  const changing: Array<{ collection: CollectionSlug; id: number | string; status?: string; title?: string }> = []
  for (const collection of COLLECTIONS) {
    const found = await payload.find({
      collection,
      where: { author: { equals: fromAuthor.id } },
      limit: 0,
      pagination: false,
      depth: 0,
      overrideAccess: true,
    })
    for (const doc of found.docs as unknown as Array<{ id: number; status?: string; title?: string }>) {
      if (ids && !ids.has(String(doc.id))) continue
      changing.push({ collection, id: doc.id, status: doc.status, title: doc.title })
    }
  }

  console.log(`to change: ${changing.length}\n`)
  for (const item of changing) {
    console.log(`  ${item.collection.padEnd(22)} ${String(item.id).padStart(5)}  ${(item.status ?? '?').padEnd(9)}  ${item.title ?? ''}`)
  }

  if (!apply) {
    console.log('\nDry run. Nothing was written. Re-run with --apply to commit.')
    return
  }

  let updated = 0
  let failed = 0
  for (const item of changing) {
    try {
      await payload.update({
        collection: item.collection,
        id: item.id,
        data: { author: toAuthor.id },
        overrideAccess: true,
      })
      updated += 1
    } catch (error) {
      failed += 1
      console.error(`  FAILED ${item.collection} ${item.id}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  console.log(`\nupdated: ${updated}`)
  console.log(`failed:  ${failed}`)
  if (failed > 0) process.exitCode = 1
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
