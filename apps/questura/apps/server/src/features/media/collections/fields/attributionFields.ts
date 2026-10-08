import type { Field } from 'payload'

export function validateSourceUrl(value: unknown): true | string {
  if (value === undefined || value === null || value === '') return true
  if (typeof value !== 'string') return 'Enter an HTTP or HTTPS source URL.'
  try {
    const url = new URL(value)
    if (['https:', 'http:'].includes(url.protocol) && !url.username && !url.password) return true
  } catch { /* Invalid URL. */ }
  return 'Enter an HTTP or HTTPS source URL.'
}

/** Snapshot attribution survives changes to, or deletion of, an original photo. */
export const attributionFields = (): Field[] => [
  { name: 'edit_credit', label: 'Composite / edit credit', type: 'text', maxLength: 160 },
  {
    name: 'sources', label: 'Photo sources', type: 'array', maxRows: 64,
    admin: { description: 'Original photo attribution in composition order. Links point to original sources, not generated image files.' },
    fields: [
      { name: 'position', type: 'text', required: true, maxLength: 160 },
      { name: 'title', type: 'text', maxLength: 160 },
      { name: 'credit', label: 'Photographer / source', type: 'text', required: true, maxLength: 500 },
      { name: 'url', label: 'Original source URL', type: 'text', validate: validateSourceUrl },
      { name: 'mediaSet', type: 'relationship', relationTo: 'media-sets', maxDepth: 0 },
      { name: 'mediaAsset', type: 'relationship', relationTo: 'media-assets', maxDepth: 0 },
    ],
  },
]
