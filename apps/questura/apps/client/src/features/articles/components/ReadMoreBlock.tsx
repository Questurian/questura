import type { ReadMoreBlock } from '../types'
import { isReadMoreUrl } from '../lib/readMore'

export function ReadMoreBlockRenderer({ block }: { block: ReadMoreBlock }) {
  if (!block.title?.trim() || !isReadMoreUrl(block.url)) return null

  return (
    <aside className="my-7 min-w-0 sm:my-9">
      <a
        href={block.url}
        title={block.title}
        className="group flex min-w-0 items-center gap-2 font-editorial text-lg font-normal leading-snug text-accent underline-offset-4 hover:font-bold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent sm:text-xl"
      >
        <span className="shrink-0 group-hover:underline">READ MORE:</span>
        <span className="min-w-0 truncate group-hover:underline">{block.title}</span>
      </a>
    </aside>
  )
}
