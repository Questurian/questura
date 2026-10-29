import type { ReadMoreBlock } from '../types'
import { isReadMoreUrl } from '../lib/readMore'

// Matches the AI Blog Writer preview: one blue Mono line, no label or rules.
export function ReadMoreBlockRenderer({ block }: { block: ReadMoreBlock }) {
  if (!block.title?.trim() || !isReadMoreUrl(block.url)) return null

  return (
    <aside className="min-w-0 py-4">
      <a
        href={block.url}
        title={block.title}
        className="article-read-more inline-block max-w-full truncate font-mono font-bold uppercase leading-snug text-accent underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
      >
        <span className="article-read-more-title">{`READ MORE: ${block.title}`}</span>
      </a>
    </aside>
  )
}
