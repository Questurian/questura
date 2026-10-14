export const EDITORIAL_FEATURE_SLOT_COUNTS = [2, 3, 4, 6] as const
export const EDITORIAL_FEATURE_DEFAULT_SLOT_COUNT = 3
export const EDITORIAL_FEATURE_KICKER_MAX = 40
export const EDITORIAL_FEATURE_TITLE_MAX = 100
export const EDITORIAL_FEATURE_DESCRIPTION_MAX = 600

/** ISO 3166-1 alpha-2 codes; the client serves each as `/flags/<code>.svg`. */
export const EDITORIAL_FEATURE_FLAGS = [
  { value: 'PE', label: 'Peru' },
  { value: 'CO', label: 'Colombia' },
  { value: 'MX', label: 'Mexico' },
] as const
export type EditorialFeatureFlag = (typeof EDITORIAL_FEATURE_FLAGS)[number]['value']

/** `dark` inverts the panel: ink band, light type. */
export const EDITORIAL_FEATURE_THEMES = ['light', 'dark'] as const
export type EditorialFeatureTheme = (typeof EDITORIAL_FEATURE_THEMES)[number]
export const DEFAULT_EDITORIAL_FEATURE_THEME: EditorialFeatureTheme = 'light'

export function editorialFeatureFlag(value: unknown): EditorialFeatureFlag | null {
  return EDITORIAL_FEATURE_FLAGS.find((flag) => flag.value === value)?.value ?? null
}

export function editorialFeatureTheme(value: unknown): EditorialFeatureTheme {
  return EDITORIAL_FEATURE_THEMES.find((theme) => theme === value) ?? DEFAULT_EDITORIAL_FEATURE_THEME
}
