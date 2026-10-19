import type { ReadMoreBlock } from '../types'
import { isReadMoreUrl } from '../lib/readMore'

export function ReadMoreBlockRenderer({ block }: { block: ReadMoreBlock }) {
  if (!block.title?.trim() || !isReadMoreUrl(block.url)) return null

  return (
    <aside className="my-7 min-w-0 border-y border-foreground/15 py-4 sm:my-9">
      <a href={block.url} title={block.title}
        className="group flex min-w-0 items-baseline gap-2 text-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent sm:gap-3">
        <span className="shrink-0 font-[family-name:var(--font-dm-sans)] text-xs font-bold tracking-[0.06em]">READ MORE:</span>
        <span className="min-w-0 truncate font-editorial text-lg font-semibold leading-snug group-hover:underline sm:text-xl">{block.title}</span>
      </a>
    </aside>
  )
}
