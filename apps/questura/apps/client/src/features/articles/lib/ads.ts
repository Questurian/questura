/**
 * Master switch for every ad slot on article pages.
 *
 * Off: no network is wired in, and the empty "Ad space" mocks read as
 * unfinished on a paid site (Questurian/questura#6). The placement planners,
 * slot components and rail layout stay, so turning ads on is this one line --
 * flip it only when a real creative mounts inside `AdMockSurface`'s box.
 *
 * Dependency-free so the node:test suite can import it.
 */
export const ADS_ENABLED = false
