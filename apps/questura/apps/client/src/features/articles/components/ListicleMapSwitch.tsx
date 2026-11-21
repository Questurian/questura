import type { JSX } from 'react'
import { List, Map as MapIcon, Rows2 } from 'lucide-react'
import {
  LISTICLE_MAP_MODE_LABELS,
  LISTICLE_MAP_MODES,
  type ListicleMapMode,
} from '@/features/articles/components/ListicleMapModes'

const MODE_ICONS: Record<ListicleMapMode, typeof List> = {
  list: List,
  split: Rows2,
  map: MapIcon,
}

/**
 * The phone's List / Split / Map switch. One drawing for the live sheet and
 * for the frame the server paints in its place (ListicleMapSheetFrame), so
 * the two are the same pixels and the hand-over cannot be seen.
 */
export function ListicleMapSwitch({
  mode,
  onSelect,
}: {
  mode: ListicleMapMode
  /** Absent on the server-painted frame, which only holds the place. */
  onSelect?: (mode: ListicleMapMode) => void
}): JSX.Element {
  return (
    <div
      role="group"
      aria-label="Article view"
      className="pointer-events-auto flex items-center gap-0.5 rounded-full border border-foreground/15 bg-paper p-1 shadow-[0_6px_20px_rgba(26,26,26,0.18)]"
    >
      {LISTICLE_MAP_MODES.map((option) => {
        const isCurrent = option === mode
        const Icon = MODE_ICONS[option]
        return (
          <button
            key={option}
            type="button"
            aria-pressed={isCurrent}
            aria-controls="listicle-map-sheet-panel"
            onClick={onSelect ? () => onSelect(option) : undefined}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-bold uppercase leading-none tracking-[0.12em] transition-colors 380:px-4 ${
              isCurrent
                ? 'bg-accent text-white'
                : 'text-foreground/60 hover:text-foreground'
            }`}
          >
            <Icon className="size-[15px] shrink-0" aria-hidden="true" />
            {LISTICLE_MAP_MODE_LABELS[option]}
          </button>
        )
      })}
    </div>
  )
}
