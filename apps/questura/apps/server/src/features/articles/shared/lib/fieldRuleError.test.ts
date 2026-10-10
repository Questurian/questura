import { formatErrors, ValidationError } from 'payload'
import { describe, expect, it } from 'vitest'
import { fieldRuleError } from './fieldRuleError'

describe('fieldRuleError', () => {
  const error = fieldRuleError({
    collection: 'articles',
    path: 'seoSection.metaDescription',
    label: 'Meta description (SEO & Metadata tab)',
    message: 'Meta description is 46 characters — at least 50 required for indexing.',
  })

  it('is a public 400 ValidationError, so Payload neither hides the message nor reports a server fault', () => {
    expect(error).toBeInstanceOf(ValidationError)
    expect(error.status).toBe(400)
    expect(error.isPublic).toBe(true)
  })

  it('answers with the field path and the plain message', () => {
    expect(formatErrors(error)).toEqual({
      errors: [
        {
          name: 'ValidationError',
          message: 'Meta description is 46 characters — at least 50 required for indexing.',
          data: {
            collection: 'articles',
            errors: [
              {
                path: 'seoSection.metaDescription',
                label: 'Meta description (SEO & Metadata tab)',
                message: 'Meta description is 46 characters — at least 50 required for indexing.',
              },
            ],
          },
        },
      ],
    })
  })
})
