import { describe, expect, it } from 'vitest'
import { Articles } from './Articles'

const publishRulesHook = Articles.hooks?.beforeValidate?.at(-1)

const META_50 = 'A meta description that is exactly fifty chars long'.slice(0, 50)

function publishedArticle(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    title: 'Where Lima eats ceviche',
    location: 'peru|lima',
    step1_complete: true,
    status: 'published',
    category: 3,
    slug: 'where-lima-eats-ceviche',
    seoSection: { metaDescription: META_50 },
    ...overrides,
  }
}

async function runPublishRules(data: Record<string, unknown>) {
  if (!publishRulesHook) throw new Error('Articles beforeValidate hook is unavailable')
  return publishRulesHook({
    data,
    operation: 'update',
    req: { payload: {} },
  } as never)
}

async function rejection(data: Record<string, unknown>) {
  try {
    await runPublishRules(data)
  } catch (error) {
    return error as { status: number; data: { errors: Array<{ path: string; message: string }> } }
  }
  throw new Error('expected the publish rules to reject')
}

describe('Articles publish rules', () => {
  it('accepts an article that meets every rule, with a 50-character meta description', async () => {
    expect(META_50).toHaveLength(50)
    await expect(runPublishRules(publishedArticle())).resolves.toBeTruthy()
  })

  it('answers a 46-character meta description with a 400 on seoSection.metaDescription', async () => {
    const error = await rejection(
      publishedArticle({ seoSection: { metaDescription: `  ${META_50.slice(0, 46)}  ` } }),
    )
    expect(error.status).toBe(400)
    expect(error.data.errors).toEqual([
      expect.objectContaining({
        path: 'seoSection.metaDescription',
        message: 'Meta description is 46 characters — at least 50 required for indexing.',
      }),
    ])
  })

  it.each([
    ['seoSection.metaDescription', { seoSection: { metaDescription: '   ' } }],
    ['slug', { slug: '' }],
    ['category', { category: null }],
  ])('answers a missing %s with a 400 on that field', async (path, overrides) => {
    const error = await rejection(publishedArticle(overrides))
    expect(error.status).toBe(400)
    expect(error.data.errors[0].path).toBe(path)
  })

  it('does not apply publish rules to drafts', async () => {
    await expect(
      runPublishRules(publishedArticle({ status: 'draft', slug: '', category: null, seoSection: {} })),
    ).resolves.toBeTruthy()
  })
})
