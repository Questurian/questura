import {
  ARTICLE_LIST_LAYOUT_VALUES,
  DEFAULT_ARTICLE_LIST_LAYOUT,
  type ArticleListLayout,
} from '../constants'

export function normalizeArticleListLayout(raw: unknown): ArticleListLayout {
  return (ARTICLE_LIST_LAYOUT_VALUES as readonly unknown[]).includes(raw)
    ? (raw as ArticleListLayout)
    : DEFAULT_ARTICLE_LIST_LAYOUT
}

type ParseResult =
  | { ok: true; omit: true }
  | { ok: true; omit: false; value: ArticleListLayout }
  | { ok: false; message: string }

/** `null` resets to the default; anything outside the list is a 400. */
export function parseArticleListLayoutBodyField(body: Record<string, unknown>): ParseResult {
  if (!Object.prototype.hasOwnProperty.call(body, 'articleListLayout')) {
    return { ok: true, omit: true }
  }

  const v = body.articleListLayout
  if (v === null) {
    return { ok: true, omit: false, value: DEFAULT_ARTICLE_LIST_LAYOUT }
  }
  if (typeof v !== 'string') {
    return { ok: false, message: 'articleListLayout must be a string.' }
  }
  if (!(ARTICLE_LIST_LAYOUT_VALUES as readonly string[]).includes(v)) {
    return {
      ok: false,
      message: `articleListLayout must be one of: ${ARTICLE_LIST_LAYOUT_VALUES.join(', ')}.`,
    }
  }

  return { ok: true, omit: false, value: v as ArticleListLayout }
}
