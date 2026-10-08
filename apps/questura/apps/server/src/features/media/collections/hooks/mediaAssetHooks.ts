import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionBeforeChangeHook,
} from 'payload'
import { syncLocationFields } from '@/shared/location/server/syncLocationFields'
import { ensureWidthLadder } from './ensureWidthLadder'
import { removeWidthLadder } from './removeWidthLadder'
import { ensureMediaSetVariant, syncMediaSetVariant } from './mediaSetVariant'
import { setUploadedBy } from './setUploadedBy'
import { syncBunnyOriginalUrl } from './syncBunnyOriginalUrl'
import { inheritAttribution } from './inheritAttribution'

export const mediaAssetHooks = {
  beforeValidate: [syncLocationFields()],
  beforeChange: [
    ensureMediaSetVariant,
    inheritAttribution,
    setUploadedBy,
    syncBunnyOriginalUrl,
  ] as CollectionBeforeChangeHook[],
  afterChange: [syncMediaSetVariant, ensureWidthLadder()] as CollectionAfterChangeHook[],
  afterDelete: [removeWidthLadder()] as CollectionAfterDeleteHook[],
}
