import type { ReadMoreBlock } from '../types'
import { isReadMoreUrl } from '../lib/readMore'

export function ReadMoreBlockRenderer({ block }: { block: ReadMoreBlock }) {
  if (!block.title?.trim() || !isReadMoreUrl(block.url)) return null

  return (
    <aside className="my-7 min-w-0 sm:my-9">
      <a
        href={block.url}
        title={block.title}
        className="article-read-more inline-block max-w-full truncate font-mono font-bold uppercase leading-snug text-accent underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
      >
        {`READ MORE: ${block.title}`}
      </a>
    </aside>
  )
}
