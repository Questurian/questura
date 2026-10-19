/** Accept web destinations and same-site paths, never active-content URLs. */
export function isReadMoreUrl(value: string): boolean {
  if (!value || /[\s\\]/.test(value)) return false
  if ([...value].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) return false
  if (value.startsWith('/')) return !value.startsWith('//')
  if (!/^https?:\/\//i.test(value)) return false
  try {
    const url = new URL(value)
    return Boolean(url.hostname) && !url.username && !url.password
  } catch {
    return false
  }
}
