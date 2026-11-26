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

/** A jump target for one section heading: where its run starts, and its DOM id. */
export type ListicleSectionAnchor = { start: number; id: string }

/** "After dark" -> "after-dark"; accents dropped, anything else becomes a hyphen. */
export function slugifySection(section: string): string {
  return section
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * The DOM id of every section heading, in list order. Ids come from the
 * section's name (`#sunset`, `#after-dark`), so a link written into the intro
 * keeps pointing at its section when the editor reorders the list. A name
 * that leaves nothing to slug falls back to its position, and a name used for
 * two separate runs gets `-2`, `-3` on the later ones. Computing ids over a
 * prefix of the list gives the same ids as over the whole list, so a locked
 * list's sample and the member's full list agree.
 */
export function listicleSectionAnchors(
  items: readonly { section?: string | null }[],
): ListicleSectionAnchor[] {
  const used = new Map<string, number>()
  const anchors: ListicleSectionAnchor[] = []
  for (const run of groupListicleItemsBySection(items)) {
    if (!run.section) continue
    const base = slugifySection(run.section) || `listicle-section-${run.start}`
    const seen = used.get(base) ?? 0
    used.set(base, seen + 1)
    anchors.push({ start: run.start, id: seen === 0 ? base : `${base}-${seen + 1}` })
  }
  return anchors
}
