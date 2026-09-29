import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const RENDERERS = [
  ['LoginModalRenderer.tsx', 'LoginModal'],
  ['PasswordResetModalRenderer.tsx', 'PasswordResetModal'],
  ['UserModalRenderer.tsx', 'UserModal'],
  ['MenuModalRenderer.tsx', 'MenuModal'],
]

function read(file) {
  return readFileSync(fileURLToPath(new URL(`./${file}`, import.meta.url)), 'utf8')
}

// `dynamic()` splits a modal into its own chunk. It does not postpone anything
// once the component is mounted, and every one of these was mounted on first
// paint -- so a cold page downloaded four modals that immediately returned
// null. The split only pays off behind the open.
test('no renderer statically imports the modal body it guards', () => {
  for (const [file, modal] of RENDERERS) {
    const source = read(file)
    assert.doesNotMatch(
      source,
      new RegExp(`^import ${modal} from`, 'm'),
      `${file} ships ${modal} with the page instead of waiting for the open`,
    )
    assert.match(
      source,
      new RegExp(`dynamic\\(\\(\\) => import\\('@/components/layout/${modal}'\\)`),
      `${file} must load ${modal} on demand`,
    )
  }
})

// A dynamic() call inside the component body builds a new component type on
// every render, which remounts the modal and loses whatever the reader typed.
test('every dynamic import is declared at module scope', () => {
  for (const [file] of RENDERERS) {
    const body = read(file).split(/export default function/)[1] ?? ''
    assert.doesNotMatch(body, /dynamic\(/, `${file} declares a dynamic import inside its component`)
  }
})

// The subscriber is the part that hears the open. If the store hook moved
// behind the gate too, nothing would ever open the modal.
test('each renderer still subscribes to its store while closed', () => {
  for (const [file] of RENDERERS) {
    assert.match(read(file), /use\w*ModalStore\(\)/, `${file} stopped listening for its open`)
  }
})

// The flags are ~1KB SVGs the menu is certain to ask for. They wait for the
// reader to reach for the menu button, not the click and not hydration: every
// page used to download five flags it never showed (#9).
test('menu flags are fetched on intent, not on every page', () => {
  const source = read('MenuModalRenderer.tsx')
  const warmAt = source.indexOf('{isWarm')
  const prefetchAt = source.indexOf('rel="prefetch"')
  const gateAt = source.indexOf('{isOpen ?')
  assert.doesNotMatch(source, /rel="preload"/, 'flags must not preload on every page')
  assert.ok(warmAt > 0 && prefetchAt > warmAt, 'flag prefetch must wait for the warm signal')
  assert.ok(prefetchAt < gateAt, 'flag prefetch must not wait for the menu to open')
  const icon = readFileSync(
    new URL('../../features/Navigation/shared/components/icons/MenuIcon.tsx', import.meta.url),
    'utf8',
  )
  for (const event of ['onPointerEnter', 'onFocus', 'onTouchStart']) {
    assert.match(icon, new RegExp(`${event}=\\{warmMenuModal\\}`), `menu button stopped warming on ${event}`)
  }
})

// Server-rendered menu data is the whole reason opening the nav costs no
// request. Deferring the modal must not drop the props that carry it.
test('the deferred menu still receives the server-rendered data', () => {
  assert.match(read('MenuModalRenderer.tsx'), /initialLocationMenu=\{locationMenu\}/)
})
