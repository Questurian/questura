import { notFound, permanentRedirect } from 'next/navigation'
import { JsonLd } from '@/components/seo/JsonLd'
import { ArticlePage } from '@/features/articles/ArticlePage'
import { isStandardArticle } from '@/features/articles/lib/articleGuards'
import { buildArticlePageJsonLd } from '@/features/articles/lib/articlePageJsonLd'
import { isLocked } from '@/features/articles/lib/gate'
import {
  fetchArticleByCanonicalPath,
  fetchRedirectByPath,
} from '@/features/articles/lib/fetchArticleByCanonicalPath'

type Params = {
  path: string
  lang?: string
}

export async function renderStandardArticleByPath({ path, lang }: Params) {
  const article = await fetchArticleByCanonicalPath({ path, lang })

  if (article && isStandardArticle(article)) {
    return (
      <>
        <JsonLd data={buildArticlePageJsonLd({ article, path, locked: isLocked(article) })} />
        <ArticlePage article={article} path={path} />
      </>
    )
  }

  const redirect = await fetchRedirectByPath(path)
  if (redirect) {
    permanentRedirect(redirect.newPath)
  }

  notFound()
}
