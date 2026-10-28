/**
 * Hotel runs: two or more Hotel Cards in a row are drawn as one carousel.
 *
 * Owner request, 2026-10-27: the homepage already shows hotels as a carousel
 * (the hotel grid the AI Blog Writer composes), and an article listing several
 * hotels should read the same way. Nothing new is stored: a run is found at
 * render time, so every article that already has hotels side by side gets it.
 * The blocks keep their indexes, so the ad plan and the paywall seam (both
 * indexed against the drawn blocks) are untouched: the first card of a run
 * draws the carousel and the rest draw nothing.
 *
 * Dependency-free on purpose (see `stayBoxes`): `pnpm test` runs this through
 * `node --experimental-strip-types`.
 */

type RunnableBlock<H> = { blockType: string; hotel?: H | null }

export type HotelRuns<H> = {
  /** Index of a run's first card -> every hotel in the run, in order. */
  starts: Map<number, H[]>
  /** Indexes of the other cards in a run, which the carousel already holds. */
  members: Set<number>
}

export function findHotelRuns<H>(blocks: ReadonlyArray<RunnableBlock<H>>): HotelRuns<H> {
  const starts = new Map<number, H[]>()
  const members = new Set<number>()

  let index = 0
  while (index < blocks.length) {
    if (blocks[index].blockType !== 'hotel-card') {
      index += 1
      continue
    }
    const first = index
    while (index < blocks.length && blocks[index].blockType === 'hotel-card') index += 1
    // A hotel that is unpublished or gone arrives as null and is left out.
    const hotels = blocks
      .slice(first, index)
      .map((block) => block.hotel)
      .filter((hotel): hotel is H => hotel !== null && hotel !== undefined)
    if (hotels.length < 2) continue
    starts.set(first, hotels)
    for (let member = first + 1; member < index; member += 1) members.add(member)
  }

  return { starts, members }
}
