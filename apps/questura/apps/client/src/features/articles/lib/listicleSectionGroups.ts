/**
 * Splits a single-type listicle into runs for section headings: neighbouring
 * items that share a section form one run under one heading. Sections are
 * typed by the editor, so names match ignoring case and outer spaces, and the
 * run takes the first item's spelling. Items without a section form runs with
 * no heading. Order is never changed, so numbering stays 1..N.
 */
export type ListicleSectionRun<T> = {
  /** Section name shared by the run, or null for items with none. */
  section: string | null
  /** Zero-based position of the run's first item in the full list. */
  start: number
  items: T[]
}

/** The section an item sits under, or null for none. */
export function listicleSectionOf(item: { section?: string | null }): string | null {
  const section = typeof item.section === 'string' ? item.section.trim() : ''
  return section === '' ? null : section
}

const sameSection = (a: string | null, b: string | null): boolean =>
  a === null || b === null ? a === b : a.toLowerCase() === b.toLowerCase()

export function groupListicleItemsBySection<T extends { section?: string | null }>(
  items: readonly T[],
): ListicleSectionRun<T>[] {
  const runs: ListicleSectionRun<T>[] = []
  items.forEach((item, index) => {
    const section = listicleSectionOf(item)
    const current = runs[runs.length - 1]
    if (current && sameSection(current.section, section)) {
      current.items.push(item)
      return
    }
    runs.push({ section, start: index, items: [item] })
  })
  return runs
}

/** DOM id of the heading that opens the run starting at `start`. */
export function listicleSectionHeadingId(start: number): string {
  return `listicle-section-${start}`
}
