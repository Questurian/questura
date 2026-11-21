/**
 * The reader's navbar colour: dark (the default) or light. It recolours the
 * navbar only; the page underneath keeps its own palette.
 *
 * The choice is kept in this browser's localStorage and applied as
 * `<html data-nav-theme="dark">`. The palettes themselves are CSS tokens in
 * foundations.css ("Navbar theme"), so switching is one attribute write: no
 * React state, no re-render. An inline `<head>` script (below) applies the
 * saved choice before first paint, and the server already renders `<html>`
 * with `data-nav-theme="dark"`, so a reader never sees the wrong bar
 * flash in first.
 *
 * No saved choice (first visit, private window, storage blocked) means dark
 * (owner, 2026-11-21). Only a saved `light` gives the light bar.
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
    return storage?.getItem(NAV_THEME_KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

/** Dark sets the attribute; light removes it (the CSS without it is the light bar). */
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
 * `readNavTheme`: only a saved `light` clears the attribute.
 */
export const NAV_THEME_SCRIPT = `(function(){var t=null;try{t=localStorage.getItem("${NAV_THEME_KEY}")}catch(e){}var d=document.documentElement.dataset;if(t==="light")delete d.navTheme;else d.navTheme="dark"})()`
