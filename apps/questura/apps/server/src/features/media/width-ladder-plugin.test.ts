import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import sharp from 'sharp'
import { cloudStoragePlugin } from '@payloadcms/plugin-cloud-storage'
import type { Config } from 'payload'
import { MediaAsset } from './collections/MediaAsset'
import { widthLadderAfterStoragePlugin } from './width-ladder-plugin'
import { bunnyLadderIo } from './pipeline/backfill-width-ladder'
import { WIDTH_LADDER, ladderFilename } from './pipeline/width-ladder'

const HERE = path.dirname(fileURLToPath(import.meta.url))

describe('REST variant uploads through cloud storage', () => {
  it('uploads base bytes before the width hook reads them', async () => {
    const filename = 'composite-fine-dining_square.webp'
    const buffer = await sharp({
      create: { width: 1080, height: 1080, channels: 3, background: '#123456' },
    })
      .webp()
      .toBuffer()
    const stored = new Map<string, Buffer>()
    const events: string[] = []
    vi.spyOn(bunnyLadderIo, 'exists').mockImplementation(async (name) => stored.has(name))
    vi.spyOn(bunnyLadderIo, 'read').mockImplementation(async (name) => {
      events.push('read')
      const bytes = stored.get(name)
      if (!bytes) throw new Error('Bunny 404: base has not been uploaded')
      return bytes
    })
    vi.spyOn(bunnyLadderIo, 'write').mockImplementation(async (name, bytes) => {
      stored.set(name, bytes)
    })
    const storage = cloudStoragePlugin({
      collections: {
        'media-assets': {
          prefix: 'media',
          adapter: () => ({
            name: 'test-storage',
            handleUpload: async ({ file }) => {
              events.push('upload')
              stored.set(file.filename, file.buffer)
            },
            handleDelete: async () => {},
            staticHandler: async () => new Response(),
          }),
        },
      },
    })
    const config = widthLadderAfterStoragePlugin(storage({ collections: [MediaAsset] } as Config))
    const collection = config.collections!.find((item) => item.slug === 'media-assets')!
    const logger = { error: vi.fn() }
    const req = { file: { data: buffer, size: buffer.length }, context: {}, payload: { logger } }
    let doc = { id: 1, filename, variant: 'square', mimeType: 'image/webp' }
    try {
      for (const hook of collection.hooks!.afterChange!) {
        doc = (await hook({ doc, operation: 'create', req } as never)) ?? doc
      }
      expect(events).toEqual(['upload', 'read'])
      expect(logger.error).not.toHaveBeenCalled()
      for (const width of WIDTH_LADDER) {
        const rung = stored.get(ladderFilename(filename, width))
        expect(rung, `missing w${width}`).toBeDefined()
        expect((await sharp(rung!).metadata()).width).toBe(width)
      }
    } finally {
      vi.restoreAllMocks()
    }
  }, 30_000)

  it('is registered after Bunny storage in the real config', () => {
    // plugin-cloud-storage appends its upload hook when its plugin runs, so
    // only a later plugin can append after it. Order in this array is the fix.
    const source = readFileSync(path.join(HERE, '../../payload.config.ts'), 'utf8')
    const plugins = source.slice(source.indexOf('plugins: ['))
    const storage = plugins.indexOf('bunnyStorage(')
    const ladder = plugins.indexOf('widthLadderAfterStoragePlugin')
    expect(storage).toBeGreaterThan(-1)
    expect(ladder).toBeGreaterThan(storage)
  })

  it('is not also registered on the collection, where it runs before the upload', () => {
    const source = readFileSync(path.join(HERE, 'collections/hooks/mediaAssetHooks.ts'), 'utf8')
    expect(source).not.toContain('ensureWidthLadder')
  })
})
