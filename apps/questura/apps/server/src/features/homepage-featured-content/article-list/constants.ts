/**
 * Article-list looks. `standard` is the original rows (copy left, small image
 * right); `square-with-ad` puts a square image on the left of each row and
 * leaves a rail on the right for an ad. A block with no stored value is
 * `standard`, so existing pages do not change until an editor picks.
 */
export const ARTICLE_LIST_LAYOUT_VALUES = ['standard', 'square-with-ad'] as const

export type ArticleListLayout = (typeof ARTICLE_LIST_LAYOUT_VALUES)[number]

export const DEFAULT_ARTICLE_LIST_LAYOUT: ArticleListLayout = 'standard'
