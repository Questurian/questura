/** Scoped, add-only repair. Default is dry-run; --apply explicitly writes missing copies. */
import 'dotenv/config'
import {
  backfillAssetLadder,
  bunnyLadderIo,
  variantFromFilename,
} from '../src/features/media/pipeline/backfill-width-ladder'

async function main() {
  const args = process.argv.slice(2)
  const apply = args.includes('--apply')
  const filenames = [...new Set(args.filter((arg) => arg !== '--apply'))]
  if (!filenames.length) throw new Error('Pass exact variant filenames, optionally --apply')
  const assets = filenames.map((filename) => {
    const variant = variantFromFilename(filename)
    if (!variant || !/^[a-zA-Z0-9_-]+\.(webp|png|jpe?g)$/.test(filename)) {
      throw new Error(`Invalid variant filename: ${filename}`)
    }
    return { id: 0, filename, variant }
  })
  // Read-only preview still decodes and resizes real bytes, proving the repair is viable.
  const io = apply ? bunnyLadderIo : { ...bunnyLadderIo, write: async () => undefined }
  let failures = 0
  console.log(apply ? 'Writing missing copies only' : 'DRY RUN: no files or records changed')
  for (const asset of assets) {
    const result = await backfillAssetLadder(asset, io)
    console.log(
      `${asset.filename}: ${apply ? 'added' : 'would add'} ${result.written.join(',') || 'none'}; already present ${result.alreadyPresent.join(',') || 'none'}`,
    )
    for (const failed of result.failed) {
      failures++
      console.error(`${asset.filename} w${failed.width}: ${failed.reason}`)
    }
  }
  process.exitCode = failures ? 1 : 0
}
main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
