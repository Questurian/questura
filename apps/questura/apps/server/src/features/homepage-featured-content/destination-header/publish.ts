function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function getDestinationHeaderPublishBlockers(
  block: Record<string, unknown>,
  blockIndex: number,
): string[] {
  const prefix = `Block ${blockIndex + 1}`
  const blockers: string[] = []
  if (!text(block.sectionHeading)) blockers.push(`${prefix} is missing its title.`)
  if (!text(block.destinationDescription)) blockers.push(`${prefix} is missing its description.`)
  const image = isRecord(block.destinationImage) ? block.destinationImage : null
  if (!image || image.status !== 'ready' || !text(image.url)) {
    blockers.push(`${prefix} photo is missing a ready hero placement.`)
  }
  if (block.destinationImageAltReady !== true) {
    blockers.push(`${prefix} photo is missing authored alt text.`)
  }
  return blockers
}
