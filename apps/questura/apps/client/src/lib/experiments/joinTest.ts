/**
 * Which /join page middleware serves (handoff 02, ADR-0021 to come).
 *
 * The pages are static, so the choice is made before the cache: middleware
 * rewrites /join to one of the pages under app/join/[arm]. The address bar,
 * the recorded path and the canonical stay /join.
 */

/** The pages under app/join/[arm]. Typed in directly, each is a 404. */
export const JOIN_ARMS = ['test-a', 'test-b', 'show-a', 'show-b'] as const
export type JoinArm = (typeof JOIN_ARMS)[number]

/** `?show=a` or `?show=b`: a preview of one design, never recorded, no cookie. */
export function previewArm(show: string | null): JoinArm | null {
  if (show === 'a') return 'show-a'
  if (show === 'b') return 'show-b'
  return null
}

/** True for /join/<arm> asked for by address: only middleware may serve those. */
export function isDirectArmPath(pathname: string): boolean {
  return pathname.startsWith('/join/')
}
