import type {
  ItineraryStopBlock,
  ItineraryVenueBlock,
} from '@/features/articles/types/itineraryListicle'

function isVenueStop(block: ItineraryStopBlock): block is ItineraryStopBlock & ItineraryVenueBlock {
  return block.blockType !== 'itinerary-tour-agency'
}

function venueItemId(block: ItineraryVenueBlock): string | null {
  const item = block.item as unknown
  if (typeof item === 'number' || typeof item === 'string') return String(item)
  if (item && typeof item === 'object') {
    const id = (item as { id?: unknown }).id
    if (typeof id === 'number' || typeof id === 'string') return String(id)
  }
  return null
}

/**
 * An activity stop on the same place as the stop right before it is that
 * stop's add-on (ADR 0047 in questurian-studio): something you can do while
 * you are there. It has no pin or number of its own and is drawn inside the
 * place's entry. An activity on any other place stays a stop.
 */
export function isActivityAddOn(
  block: ItineraryStopBlock,
  previous: ItineraryStopBlock | undefined,
): boolean {
  if (!previous || !isVenueStop(block) || !isVenueStop(previous)) return false
  if (!block.activityTitle?.trim()) return false
  if (block.blockType !== previous.blockType) return false
  const id = venueItemId(block)
  return id !== null && id === venueItemId(previous)
}

export type ItineraryStopGroup = {
  block: ItineraryStopBlock
  /** Position in the day's stops; row ids are built from it. */
  index: number
  addOns: { block: ItineraryVenueBlock; index: number }[]
}

/**
 * The day's stops as the reader sees them: each stop with the add-ons that
 * follow it. A run of add-ons all belong to the one place above them.
 */
export function groupItineraryStops(
  blocks: ItineraryStopBlock[] | null | undefined,
): ItineraryStopGroup[] {
  const groups: ItineraryStopGroup[] = []
  ;(blocks ?? []).forEach((block, index) => {
    const parent = groups[groups.length - 1]
    if (parent && isActivityAddOn(block, parent.block)) {
      parent.addOns.push({ block: block as ItineraryVenueBlock, index })
      return
    }
    groups.push({ block, index, addOns: [] })
  })
  return groups
}
