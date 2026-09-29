function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function getPageHeroPublishBlockers(
  block: Record<string, unknown>,
  blockIndex: number,
): string[] {
  const prefix = `Block ${blockIndex + 1}`
  const blockers: string[] = []
  if (!text(block.sectionHeading)) blockers.push(`${prefix} is missing its title.`)
  const image = isRecord(block.heroImage) ? block.heroImage : null
  if (!image || image.status !== 'ready' || !text(image.url)) {
    blockers.push(`${prefix} photo is missing a ready hero placement.`)
  }
  if (block.heroImageAltReady !== true) {
    blockers.push(`${prefix} photo is missing authored alt text.`)
  }
  return blockers
}
