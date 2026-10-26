#!/usr/bin/env node
/** Exercise dynamic routes in local workerd after the production OpenNext build.
 * A successful bundle alone does not prove that Next's server can initialize.
 * No remote bindings, deploy credentials, production requests or cache writes.
 */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { closeSync, mkdtempSync, openSync, readFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'

const client = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const config = readFileSync(join(client, 'wrangler.jsonc'), 'utf8')
assert(!/"remote"\s*:\s*true/.test(config), 'Worker smoke requires local-only bindings')
readFileSync(join(client, '.open-next/worker.js')) // Fail before starting a process if no build exists.

const socket = createServer()
await new Promise((ready, fail) => { socket.once('error', fail); socket.listen(0, '127.0.0.1', ready) })
const { port } = socket.address()
await new Promise((done) => socket.close(done))
const base = `http://127.0.0.1:${port}`
const directory = mkdtempSync(join(tmpdir(), 'questura-worker-runtime-'))
const log = join(directory, 'preview.log')
const fd = openSync(log, 'w', 0o600)
const env = { ...process.env, WRANGLER_SEND_METRICS: 'false', NEXT_TELEMETRY_DISABLED: '1' }
for (const key of ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_KEY', 'CLOUDFLARE_EMAIL', 'CF_API_TOKEN', 'CF_ACCOUNT_ID']) delete env[key]
const preview = spawn(join(client, 'node_modules/.bin/opennextjs-cloudflare'), [
  'preview', '--port', String(port), '--ip', '127.0.0.1',
  '--env-file', '/dev/null',
  '--var', 'QUESTURA_RELEASE_SHA:worker-runtime-smoke',
  '--var', 'QUESTURA_REVALIDATION_SECRET:synthetic-worker-smoke-only',
], { cwd: client, env, stdio: ['ignore', fd, fd], detached: true })
let ended = false
let startError
const exited = new Promise((done) => {
  preview.once('exit', () => { ended = true; done() })
  preview.once('error', (error) => { startError = error; ended = true; done() })
})

try {
  let response
  const deadline = Date.now() + 90_000
  while (Date.now() < deadline) {
    if (ended) throw new Error(`Worker preview exited before readiness. See ${log}`, { cause: startError })
    try { response = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(2_000) }) }
    catch { await delay(250); continue }
    break
  }
  assert(response, `Worker preview did not start within 90 seconds. See ${log}`)
  assert.equal(response.status, 200, `Dynamic Worker health must return 200; got ${response.status}. See ${log}`)
  const health = await response.json()
  assert.equal(health.status, 'healthy')
  assert.equal(health.releaseSha, 'worker-runtime-smoke')
  console.log('Worker runtime: dynamic health returns 200 with its runtime release binding.')

  // No valid secret is sent: prove a second dynamic handler initializes and
  // enforces authorization without invoking revalidation or writing caches.
  const refused = await fetch(`${base}/api/revalidate`, { method: 'POST', signal: AbortSignal.timeout(10_000) })
  assert.equal(refused.status, 401, `Unsigned revalidation must return 401. See ${log}`)
  assert.equal((await refused.json()).error, 'Unauthorized')
  console.log('Worker runtime: unsigned revalidation returns 401; no cache invalidation runs.')
} finally {
  if (!ended && preview.pid) {
    try { process.kill(-preview.pid, 'SIGTERM') } catch { /* already exited */ }
    await Promise.race([exited, delay(1_500)])
    if (!ended) {
      try { process.kill(-preview.pid, 'SIGKILL') } catch { /* already exited */ }
      await exited
    }
  }
  closeSync(fd)
}
