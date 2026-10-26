'use client'

import { useCallback, useId, useState, type JSX } from 'react'
import dynamic from 'next/dynamic'
import { Share2 } from 'lucide-react'

const articleShareTriggerClass =
  'inline-flex items-center gap-1.5 font-display text-[10px] uppercase leading-none tracking-[0.18em] text-foreground transition-opacity hover:opacity-70 active:opacity-100 380:text-[11px]'

const articleShareIconTriggerClass =
  'inline-flex items-center justify-center text-foreground/60 transition-opacity hover:opacity-60 active:opacity-100'

type ArticleShareButtonProps = {
  title: string
  imageUrl?: string | null
  url?: string
  /** `icon` drops the "Share" word, for action rows that are glyphs only. */
  variant?: 'inline' | 'icon'
}

// Nobody needs the share dialog until they press Share, and the article,
// itinerary and maps pages that carry this button sit at or over the
// first-load JavaScript cap (perf/budgets.json). So it is its own chunk,
// fetched as soon as a pointer or the keyboard reaches the button. If that
// fetch fails, the button does nothing rather than throwing into
// `app/error.tsx` (see ClientInteractionProvider).
const loadSheet = () => import('@/features/articles/components/ArticleShareSheet')
const ArticleShareSheet = dynamic(
  () =>
    loadSheet()
      .then((module) => module.ArticleShareSheet)
      .catch(() => () => null),
  { ssr: false },
)
const preloadSheet = () => void loadSheet().catch(() => undefined)

export function ArticleShareButton({
  title,
  imageUrl,
  url,
  variant = 'inline',
}: ArticleShareButtonProps): JSX.Element {
  const [open, setOpen] = useState(false)
  const dialogId = useId()

  const close = useCallback(() => setOpen(false), [])

  return (
    <div className="inline-flex" data-article-share>
      <button
        type="button"
        className={variant === 'icon' ? articleShareIconTriggerClass : articleShareTriggerClass}
        aria-label="Share article"
        title={variant === 'icon' ? 'Share' : undefined}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={dialogId}
        onPointerEnter={preloadSheet}
        onFocus={preloadSheet}
        onClick={() => setOpen(true)}
      >
        <Share2
          size={variant === 'icon' ? 17 : 13}
          strokeWidth={1.75}
          aria-hidden="true"
        />
        {variant === 'icon' ? null : 'Share'}
      </button>

      {open ? (
        <ArticleShareSheet id={dialogId} title={title} imageUrl={imageUrl} url={url} onClose={close} />
      ) : null}
    </div>
  )
}
