import type { Config } from 'payload'
import { ensureWidthLadder } from './collections/hooks/ensureWidthLadder'

/** Register AFTER cloud storage: REST uploads do not exist on Bunny before its afterChange. */
export const widthLadderAfterStoragePlugin = (config: Config): Config => ({
  ...config,
  collections: config.collections?.map((collection) =>
    collection.slug === 'media-assets'
      ? {
          ...collection,
          hooks: {
            ...collection.hooks,
            afterChange: [...(collection.hooks?.afterChange ?? []), ensureWidthLadder()],
          },
        }
      : collection,
  ),
})
