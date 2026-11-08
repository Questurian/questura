import { describe, expect, it } from 'vitest'

import { mapTeaserField, mapTeaserProblem, requireMapTeaserToPublish } from './mapTeaser'

const picture = {
  src: 'https://cdn.example.com/map.webp',
  srcSmall: 'https://cdn.example.com/map-782.webp',
  width: 782,
  height: 690,
  center: [-77.0258, -12.1435],
  zoom: 13.2,
}

describe('map picture field', () => {
  it('accepts no picture, a wide one, and a wide one with its tall one', () => {
    expect(mapTeaserProblem(null)).toBeNull()
    expect(mapTeaserProblem(undefined)).toBeNull()
    expect(mapTeaserProblem(picture)).toBeNull()
    expect(mapTeaserProblem({ ...picture, tall: { ...picture, height: 1400 }, takenAt: '2026-11-08T02:00:00Z', assetIds: [1, 2] })).toBeNull()
  })

  it('refuses pictures the page could not place markers on', () => {
    expect(mapTeaserProblem({ ...picture, src: 'http://cdn.example.com/map.webp' })).toMatch(/https/)
    expect(mapTeaserProblem({ ...picture, srcSmall: undefined })).toMatch(/https/)
    expect(mapTeaserProblem({ ...picture, width: 0 })).toMatch(/width/)
    expect(mapTeaserProblem({ ...picture, center: [-12.1, -200] })).toMatch(/center/)
    expect(mapTeaserProblem({ ...picture, center: [1] })).toMatch(/center/)
    expect(mapTeaserProblem({ ...picture, zoom: 30 })).toMatch(/zoom/)
    expect(mapTeaserProblem({ ...picture, tall: { ...picture, zoom: Number.NaN } })).toMatch(/tall/)
    expect(mapTeaserProblem('a picture')).toMatch(/missing/)
  })

  it('is stored as JSON on the guide and only written by the studio', () => {
    expect(mapTeaserField).toMatchObject({ name: 'mapTeaser', type: 'json', admin: { readOnly: true } })
  })
})

describe('publishing needs a map picture', () => {
  const run = (data: Record<string, unknown>, originalDoc?: Record<string, unknown>) =>
    (requireMapTeaserToPublish as unknown as (args: { data: Record<string, unknown>; originalDoc?: Record<string, unknown> }) => unknown)({
      data,
      originalDoc,
    })

  it('stops a members-only guide going live without one', () => {
    expect(() => run({ status: 'published', access: 'member' }, { status: 'draft' })).toThrow(/map picture first/)
    expect(() => run({ status: 'published' }, { status: 'draft', access: 'member', mapTeaser: null })).toThrow(/map picture first/)
  })

  it('lets it go live with one, or when it is free', () => {
    expect(run({ status: 'published', access: 'member', mapTeaser: picture }, { status: 'draft' })).toBeTruthy()
    expect(run({ status: 'published' }, { status: 'draft', access: 'member', mapTeaser: picture })).toBeTruthy()
    expect(run({ status: 'published', access: 'free' }, { status: 'draft' })).toBeTruthy()
  })

  it('never stops a draft save', () => {
    expect(run({ status: 'draft', access: 'member' }, { status: 'draft' })).toBeTruthy()
    expect(run({ status: 'draft', access: 'member', mapTeaser: null }, { status: 'published', access: 'member', mapTeaser: picture })).toBeTruthy()
  })

  it('lets a guide already live on its built-in picture keep saving', () => {
    expect(run({ status: 'published', access: 'member' }, { status: 'published', access: 'member', mapTeaser: null })).toBeTruthy()
    expect(run({ title: 'New title' }, { status: 'published', access: 'member' })).toBeTruthy()
  })

  it('stops a live guide losing its picture', () => {
    expect(() => run({ mapTeaser: null }, { status: 'published', access: 'member', mapTeaser: picture })).toThrow(/map picture first/)
  })

  it('stops a live free page becoming members-only without one', () => {
    expect(() => run({ access: 'member' }, { status: 'published', access: 'free' })).toThrow(/map picture first/)
    expect(run({ access: 'member', mapTeaser: picture }, { status: 'published', access: 'free' })).toBeTruthy()
    expect(run({ access: 'member' }, { status: 'published', access: 'free', mapTeaser: picture })).toBeTruthy()
  })

  it('refuses with a field rule, so the live site shows the reason', () => {
    try {
      run({ status: 'published', access: 'member' }, { status: 'draft' })
      expect.unreachable()
    } catch (error) {
      expect((error as Error).name).toBe('ValidationError')
      expect((error as { data?: { errors?: Array<{ path?: string }> } }).data?.errors?.[0]?.path).toBe('mapTeaser')
    }
  })
})
