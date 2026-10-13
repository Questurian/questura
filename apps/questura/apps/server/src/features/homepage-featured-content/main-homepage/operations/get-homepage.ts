import {
  formatMainHomepage,
  getMainHomepagePayload,
  loadMainHomepage,
} from '../lib/persistence'
import type { MainHomepageOperationResult } from '../types'
import type { CuratedPageKey } from '../pages'

export async function getMainHomepage(
  page: CuratedPageKey = 'main',
): Promise<MainHomepageOperationResult> {
  const payload = await getMainHomepagePayload()
  const doc = await loadMainHomepage(payload, page)
  return { status: 200, body: await formatMainHomepage(payload, doc) }
}
