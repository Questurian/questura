'use client'

import { useState, useSyncExternalStore } from 'react'

import { getBackendUrl } from '@/lib/api/api-config'
import { JOURNEYS_PATH, browserSaysNo, hasRecord, isOff, turnOff, turnOn } from '@/lib/journey/choice'

type State = 'loading' | 'on' | 'off' | 'off-undeleted' | 'browser-no'

function readState(): State {
  try {
    if (isOff(window.localStorage)) return hasRecord(window.localStorage) ? 'off-undeleted' : 'off'
  } catch {
    return 'off'
  }
  return browserSaysNo(navigator) ? 'browser-no' : 'on'
}

const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
const changed = () => listeners.forEach((listener) => listener())

const MESSAGE: Record<State, string> = {
  loading: '',
  on: 'Recording is allowed on this browser.',
  off: 'Off. Nothing is recorded on this browser.',
  'off-undeleted': 'Off. We could not delete what was recorded before; please try again.',
  'browser-no': 'Your browser asks not to be tracked, so nothing is being recorded.',
}

/** The privacy page's off switch (ADR-0019). */
export function JourneyChoice() {
  const state = useSyncExternalStore<State>(subscribe, readState, () => 'loading')
  const [working, setWorking] = useState(false)

  async function off() {
    setWorking(true)
    await turnOff(window.localStorage, (body) =>
      fetch(`${getBackendUrl().replace(/\/+$/, '')}${JOURNEYS_PATH}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'text/plain' },
        body,
      }),
    )
    setWorking(false)
    changed()
  }

  function on() {
    turnOn(window.localStorage)
    changed()
  }

  const button =
    'inline-flex min-h-[44px] items-center border border-foreground/40 px-4 text-[0.9rem] text-foreground hover:border-foreground disabled:opacity-50'

  return (
    <div className="mb-4 bg-paper p-4">
      <p role="status" className="mb-3 min-h-[1.5em] text-[0.9rem] text-foreground/80">
        {MESSAGE[state]}
      </p>
      {state === 'off' ? (
        <button type="button" className={button} onClick={on}>
          Turn recording back on
        </button>
      ) : (
        <button type="button" className={button} disabled={working || state === 'loading'} onClick={() => void off()}>
          {state === 'off-undeleted' ? 'Try deleting again' : 'Turn off and delete my record'}
        </button>
      )}
    </div>
  )
}
