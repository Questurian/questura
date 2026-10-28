import type { ReadMoreBlock } from '../types'
import { isReadMoreUrl } from '../lib/readMore'

export function ReadMoreBlockRenderer({ block }: { block: ReadMoreBlock }) {
  if (!block.title?.trim() || !isReadMoreUrl(block.url)) return null

  return (
    <aside className="min-w-0 border-y border-foreground/20 py-5">
      <a
        href={block.url}
        title={block.title}
        className="article-read-more block max-w-full break-words font-display leading-relaxed text-accent underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
      >
        <span className="mb-1 block font-sans text-[13px] font-medium text-foreground/65">Read next</span>
        <span className="article-read-more-title">{block.title}</span>
      </a>
    </aside>
  )
}
