import { AD_PREVIEW, type AdShape } from '../lib/adUnits'

/**
 * The box an ad sits in, at its exact size for every width the shape covers.
 *
 * The box is in the server HTML, so its space is held before any ad code
 * loads: a creative that arrives later fills it and nothing below moves. The
 * thresholds are the ones `AD_SHAPES` switches units at -- change them
 * together. The banner sizes on its own `@container` (the space the slot is
 * given), so a reading column too narrow for 728x90 gets the 320x50 at any
 * screen width. `overflow-hidden` keeps a creative from widening the page on
 * the rare phone narrower than the unit.
 *
 * No ad network is wired in (`lib/adUnits.ts`). With `NEXT_PUBLIC_AD_PREVIEW=1`
 * under `pnpm dev`: a dashed outline naming the size. Otherwise, on the live
 * site and in development: nothing at all, and the slot
 * components around it check `isAdShapeOn` and drop their label and rules
 * too. A network's slot component mounts inside this box when one is wired.
 */
const SHAPE_BOX: Record<AdShape, string> = {
  banner: 'h-[50px] max-w-[320px] @min-[728px]:h-[90px] @min-[728px]:max-w-[728px]',
  rectangle: 'h-[250px] max-w-[300px]',
  rail: 'h-[250px] max-w-[300px] 1024:h-[600px] 1024:max-w-[160px]',
}

const PREVIEW_LABEL: Record<AdShape, React.ReactNode> = {
  banner: (
    <>
      <span className="@min-[728px]:hidden">Ad · 320 × 50</span>
      <span className="hidden @min-[728px]:inline">Ad · 728 × 90</span>
    </>
  ),
  rectangle: 'Ad · 300 × 250',
  rail: (
    <>
      <span className="1024:hidden">Ad · 300 × 250</span>
      <span className="hidden 1024:inline">Ad · 160 × 600</span>
    </>
  ),
}

export function AdSurface({ shape, className = '' }: { shape: AdShape; className?: string }) {
  const box = `mx-auto w-full overflow-hidden ${SHAPE_BOX[shape]} ${className}`

  if (!AD_PREVIEW) return null

  return (
    <div data-ad-container className="@container w-full">
      <div
        data-ad-shape={shape}
        data-ad-preview
        aria-hidden
        className={`flex items-center justify-center border border-dashed border-foreground/25 font-[family-name:var(--font-dm-sans)] text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/40 ${box}`}
      >
        {PREVIEW_LABEL[shape]}
      </div>
    </div>
  )
}
