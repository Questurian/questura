/**
 * The reader's navbar colour: light (the default) or dark. It recolours the
 * navbar only; the page underneath keeps its own palette.
 *
 * The choice is kept in this browser's localStorage and applied as
 * `<html data-nav-theme="dark">`. The palettes themselves are CSS tokens in
 * foundations.css ("Navbar theme"), so switching is one attribute write: no
 * React state, no re-render. An inline `<head>` script (below) applies the
 * saved choice before first paint, so a dark reader never sees the light bar
 * flash in first.
 *
 * No saved choice (first visit, private window, storage blocked) means light.
 *
 * Dependency-free so node:test can run it.
 */

export type NavTheme = 'light' | 'dark'

export const NAV_THEME_KEY = 'qv-nav-theme'

type ThemeStorage = Pick<Storage, 'getItem' | 'setItem'>
type ThemeRoot = { dataset: Record<string, string | undefined> }

function defaultStorage(): ThemeStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

function defaultRoot(): ThemeRoot | null {
  return typeof document === 'undefined' ? null : document.documentElement
}

export function readNavTheme(storage: ThemeStorage | null = defaultStorage()): NavTheme {
  try {
    return storage?.getItem(NAV_THEME_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

/** Only dark sets the attribute; light removes it, so light is the CSS default. */
export function applyNavTheme(theme: NavTheme, root: ThemeRoot | null = defaultRoot()): void {
  if (!root) return
  if (theme === 'dark') root.dataset.navTheme = 'dark'
  else delete root.dataset.navTheme
}

/** Save the choice and repaint the navbar with it. */
export function setNavTheme(
  theme: NavTheme,
  storage: ThemeStorage | null = defaultStorage(),
  root: ThemeRoot | null = defaultRoot(),
): void {
  try {
    storage?.setItem(NAV_THEME_KEY, theme)
  } catch {
    // Storage blocked or full: the choice holds for this page only.
  }
  applyNavTheme(theme, root)
}

/**
 * Runs in `<head>` before first paint. Keep it tiny and in step with
 * `readNavTheme`: only `dark` sets the attribute.
 */
export const NAV_THEME_SCRIPT = `try{if(localStorage.getItem("${NAV_THEME_KEY}")==="dark")document.documentElement.dataset.navTheme="dark"}catch(e){}`
