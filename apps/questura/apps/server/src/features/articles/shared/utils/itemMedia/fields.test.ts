import { describe, expect, it } from 'vitest'
import { createSourceMediaFilterOptions } from './fields'

const req = {
  payload: {
    findByID: async () => ({ id: 306, gallery: [{ image: 1 }, { image: 2 }], instagramGallery: [{ post: 9 }] }),
  },
} as never

const run = (mediaType: 'photos' | 'instagram', siblingData: Record<string, unknown>) =>
  createSourceMediaFilterOptions('dining', mediaType)({ req, siblingData } as never)

describe('item media filterOptions', () => {
  it('keeps photos already on the row choosable after the gallery dropped them', async () => {
    // Payload re-runs this filter on save; photo 588 left the gallery but the guide still shows it.
    await expect(run('photos', { item: 306, selectedPhotos: [1, 588] })).resolves.toEqual({
      id: { in: [1, 2, 1, 588] },
    })
  })

  it('offers only the gallery when nothing is selected', async () => {
    await expect(run('photos', { item: 306 })).resolves.toEqual({ id: { in: [1, 2] } })
  })

  it('leaves Instagram limited to the gallery', async () => {
    await expect(run('instagram', { item: 306, selectedInstagramPost: 55 })).resolves.toEqual({
      id: { in: [9] },
    })
  })
})
