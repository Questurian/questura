import { listicleSectionAnchors, slugifySection } from './listicleSectionGroups.ts'

/**
 * Quick picks (owner, 2026-11-26): the places an editor labelled with a
 * reader's need ("Salsa", "Over 30"), listed in a box under the header so a
 * reader from a search sees names on the first screen. Order follows the
 * list, which is ranked best-first.
 */
export type ListicleQuickPick = {
  /** Zero-based position of the place in the list. */
  index: number
  label: string
  title: string
  note: string | null
  /** DOM id of the place's entry, for the jump link. */
  anchorId: string
}

type PickRow = {
  section?: string | null
  pick?: string | null
  pickNote?: string | null
  activityTitle?: string | null
  item?: { title?: string | null } | null
}

const trimmed = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

/** The name the entry shows: the activity when there is one, else the place. */
export function listicleEntryTitle(row: PickRow): string {
  return trimmed(row.activityTitle) || trimmed(row.item?.title)
}

/**
 * The DOM id of every entry, in list order, from the name it shows
 * (`#son-de-cuba`). Ids already taken by section headings, or by an earlier
 * entry with the same name, get `-2`, `-3`; a name that leaves nothing to
 * slug falls back to its position. Like section ids, computing over a prefix
 * of the list gives the same ids as over the whole list.
 */
export function listicleEntryAnchors(rows: readonly PickRow[]): string[] {
  const used = new Map<string, number>()
  for (const anchor of listicleSectionAnchors(rows)) used.set(anchor.id, 1)
  return rows.map((row, index) => {
    const base = slugifySection(listicleEntryTitle(row)) || `listicle-entry-${index + 1}`
    let seen = used.get(base) ?? 0
    let id = seen === 0 ? base : `${base}-${seen + 1}`
    while (used.has(id)) {
      seen += 1
      id = `${base}-${seen + 1}`
    }
    used.set(base, seen + 1)
    used.set(id, 1)
    return id
  })
}

/** The labelled places, in list order. Rows without a label or a name are left out. */
export function listicleQuickPicks(
  rows: readonly PickRow[],
  anchors: readonly string[] = listicleEntryAnchors(rows),
): ListicleQuickPick[] {
  const picks: ListicleQuickPick[] = []
  rows.forEach((row, index) => {
    const label = trimmed(row.pick)
    const title = listicleEntryTitle(row)
    if (!label || !title) return
    picks.push({ index, label, title, note: trimmed(row.pickNote) || null, anchorId: anchors[index] })
  })
  return picks
}
