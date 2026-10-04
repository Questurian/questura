/**
 * Splits a single-type listicle into runs for moment headings: neighbouring
 * items that share a moment form one run under one heading. Items without a
 * moment form runs with no heading. Order is never changed, so numbering
 * stays 1..N across the whole list.
 */
export type ListicleMomentRun<T> = {
  /** Moment value shared by the run, or null for items with none. */
  moment: string | null
  /** Zero-based position of the run's first item in the full list. */
  start: number
  items: T[]
}

export function groupListicleItemsByMoment<T extends { moment?: string | null }>(
  items: readonly T[],
): ListicleMomentRun<T>[] {
  const runs: ListicleMomentRun<T>[] = []
  items.forEach((item, index) => {
    const moment = item.moment || null
    const current = runs[runs.length - 1]
    if (current && current.moment === moment) {
      current.items.push(item)
      return
    }
    runs.push({ moment, start: index, items: [item] })
  })
  return runs
}
