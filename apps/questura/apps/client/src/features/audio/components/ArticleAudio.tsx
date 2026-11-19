'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent, type PointerEvent } from 'react'
import { createPortal } from 'react-dom'

import Link from '@/components/navigation/PublicLink'
import { identityStore, SHARED_IDENTITY_MAX_AGE_MS } from '@/lib/user/currentIdentity'
import { identityFromResponse } from '@/lib/user/identity'

import { audioController, type AudioState, type ReaderAccess } from '../lib/controller'
import { formatClock, slotElementId, type ArticleAudio as ArticleAudioData, type ArticleAudioClip } from '../lib/slots'

/**
 * The article's audio, once loaded (ADR-0018): a player in each narrated
 * section's slot, the floating player, and the "listen with a membership"
 * panel. Every player draws the one controller's state.
 */

const useAudio = () => useSyncExternalStore(audioController.subscribe, audioController.getSnapshot, audioController.getSnapshot)

async function readAccess(): Promise<ReaderAccess> {
  try {
    const identity = identityFromResponse(await identityStore.read({ maxAgeMs: SHARED_IDENTITY_MAX_AGE_MS }))
    if (identity.state === 'anonymous') return 'signed-out'
    return identity.member ? 'member' : 'not-member'
  } catch {
    return 'unknown'
  }
}

function useSlots(clips: ArticleAudioClip[]) {
  const [slots, setSlots] = useState<Map<string, HTMLElement>>(new Map())
  const keys = clips.map((clip) => clip.sectionKey).join('|')

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const scan = () => {
      const found = new Map<string, HTMLElement>()
      for (const clip of clips) {
        const element = document.getElementById(slotElementId(clip.sectionKey))
        if (element) {
          element.setAttribute('data-ready', '')
          found.set(clip.sectionKey, element)
        }
      }
      setSlots((previous) => {
        const same = previous.size === found.size && [...found].every(([key, element]) => previous.get(key) === element)
        if (same) return previous
        audioController.invalidateRanges()
        return found
      })
    }
    scan()
    // A member's full body replaces the free sample after the page loads.
    const observer = new MutationObserver(() => {
      clearTimeout(timer)
      timer = setTimeout(scan, 50)
    })
    observer.observe(document.querySelector('[data-article-body]') ?? document.body, { childList: true, subtree: true })
    return () => {
      observer.disconnect()
      clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys])

  return slots
}

export function ArticleAudio({
  audio,
  articleTitle,
  returnTo,
}: {
  audio: ArticleAudioData
  articleTitle: string
  returnTo: string
}) {
  const state = useAudio()
  const slots = useSlots(audio.clips)

  useEffect(() => {
    audioController.attach(audio.clips, articleTitle)
    return () => audioController.detach()
  }, [audio.clips, articleTitle])

  useEffect(() => {
    let live = true
    const refresh = () => void readAccess().then((access) => live && audioController.setAccess(access))
    refresh()
    const unsubscribe = identityStore.subscribe(refresh)
    return () => {
      live = false
      unsubscribe()
    }
  }, [])

  // Is the playing clip's own player on screen? If not, the floating one shows.
  const currentKey = audio.clips.find((clip) => clip.id === state.clipId)?.sectionKey ?? null
  useEffect(() => {
    const element = currentKey ? slots.get(currentKey) : null
    if (!element) {
      audioController.setInlineVisible(true)
      return
    }
    const observer = new IntersectionObserver(([entry]) => audioController.setInlineVisible(entry.isIntersecting), {
      threshold: 0,
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [currentKey, slots])

  const current = audio.clips.find((clip) => clip.id === state.clipId) ?? null

  return (
    <>
      {audio.clips.map((clip) => {
        const slot = slots.get(clip.sectionKey)
        return slot
          ? createPortal(<SectionPlayer key={clip.id} clip={clip} state={state} returnTo={returnTo} />, slot)
          : null
      })}
      {createPortal(<MiniPlayer clip={current} state={state} articleTitle={articleTitle} />, document.body)}
      {state.toast ? createPortal(<div className="aud-toast" role="status">{state.toast}</div>, document.body) : null}
    </>
  )
}

// ---- icons -----------------------------------------------------------------

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" /></svg>
)
const PauseIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>
)
const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
    <rect x="5" y="11" width="14" height="9" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
)
const HeadphonesIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M3 14v-2a9 9 0 0 1 18 0v2" />
    <path d="M21 15a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 2zM3 15a2 2 0 0 0 2 2h1v-6H5a2 2 0 0 0-2 2z" />
  </svg>
)
const FollowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 5v14M5 12l7 7 7-7" /></svg>
)
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
)
const Spinner = () => <span className="aud-spinner" aria-hidden="true" />

// ---- pieces ----------------------------------------------------------------

function useToggle(clipId: number) {
  return useCallback(async () => {
    if (audioController.getSnapshot().access === 'unknown') audioController.setAccess(await readAccess())
    audioController.toggle(clipId)
  }, [clipId])
}

function SeekBar({ clipId, time, duration, className }: { clipId: number; time: number; duration: number; className: string }) {
  const bar = useRef<HTMLDivElement>(null)
  const share = duration > 0 ? Math.min(1, time / duration) : 0
  const seekTo = (event: PointerEvent<HTMLDivElement>) => {
    const rect = bar.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return
    audioController.seek(clipId, ((event.clientX - rect.left) / rect.width) * duration)
  }
  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight') audioController.seek(clipId, time + 5)
    else if (event.key === 'ArrowLeft') audioController.seek(clipId, time - 5)
    else return
    event.preventDefault()
  }
  return (
    <div
      ref={bar}
      className={className}
      role="slider"
      tabIndex={0}
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(time)}
      aria-valuetext={`${formatClock(time)} of ${formatClock(duration)}`}
      onKeyDown={onKey}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId)
        seekTo(event)
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) seekTo(event)
      }}
    >
      <span className="aud-track" />
      <span className="aud-fill" style={{ width: `${share * 100}%` }} />
      <span className="aud-knob" style={{ left: `${share * 100}%` }} />
    </div>
  )
}

function SectionPlayer({ clip, state, returnTo }: { clip: ArticleAudioClip; state: AudioState; returnTo: string }) {
  const toggle = useToggle(clip.id)
  const member = state.access === 'member'
  const isCurrent = state.clipId === clip.id
  const playing = isCurrent && state.phase === 'playing'
  const loading = isCurrent && state.phase === 'loading'
  const time = isCurrent ? state.currentTime : state.positions[clip.id] ?? 0
  const duration = isCurrent && state.duration ? state.duration : clip.durationSeconds
  const started = isCurrent || time > 0
  const lockOpen = !member && state.lockedClipId === clip.id

  const label = !member
    ? 'Members listen'
    : loading
      ? 'Loading…'
      : playing
        ? 'Listening'
        : 'Listen to this section'

  return (
    <div className="aud-player" data-locked={member ? undefined : ''} data-started={started ? '' : undefined}>
      <div className="aud-row">
        <button
          type="button"
          className="aud-play"
          onClick={() => void toggle()}
          aria-label={!member ? `Listen to ${clip.title}: members only` : playing ? `Pause ${clip.title}` : `Play ${clip.title}`}
          aria-expanded={!member ? lockOpen : undefined}
        >
          {!member ? <LockIcon /> : loading ? <Spinner /> : playing ? <PauseIcon /> : <PlayIcon />}
        </button>
        <div className="aud-meta">
          <p className="aud-label">
            <HeadphonesIcon />
            {label}
          </p>
          <p className="aud-sub">
            {clip.title} · read by {clip.voiceName} · {formatClock(clip.durationSeconds)}
          </p>
        </div>
        {member ? (
          <div className="aud-tools">
            <button type="button" className="aud-speed" onClick={() => audioController.cycleSpeed()} aria-label={`Speed ${state.speed} times`}>
              {state.speed}×
            </button>
            <button
              type="button"
              className="aud-follow"
              role="switch"
              aria-checked={state.follow}
              onClick={() => audioController.setFollow(!state.follow)}
            >
              <span className="aud-switch" aria-hidden="true" />
              <span className="aud-follow-label">Follow along</span>
            </button>
          </div>
        ) : null}
      </div>
      {member ? (
        <>
          <SeekBar clipId={clip.id} time={time} duration={duration} className="aud-bar" />
          <div className="aud-times">
            <span>{started ? formatClock(time) : ''}</span>
            <span>-{formatClock(Math.max(0, duration - time))}</span>
          </div>
        </>
      ) : null}
      {isCurrent && state.phase === 'error' && state.error ? <p className="aud-error">{state.error}</p> : null}
      {lockOpen ? <LockPanel access={state.access} returnTo={`${returnTo}#${slotElementId(clip.sectionKey)}`} /> : null}
    </div>
  )
}

function LockPanel({ access, returnTo }: { access: ReaderAccess; returnTo: string }) {
  const href = `/join?returnTo=${encodeURIComponent(returnTo)}`
  const signedIn = access === 'not-member'
  return (
    <div className="aud-lock" role="region" aria-label="Members-only audio">
      <p className="aud-lock-title">Listen with a Questurian membership</p>
      <p className="aud-lock-text">
        Members can listen to every section of our guides, read aloud, with the text following along as you go.
      </p>
      <div className="aud-lock-actions">
        <Link href={href} className="aud-lock-cta">
          {signedIn ? 'Join to listen' : 'Become a member to listen'}
        </Link>
        {signedIn ? null : (
          <span className="aud-lock-signin">
            Already a member? <Link href={href}>Sign in</Link>
          </span>
        )}
      </div>
    </div>
  )
}

function MiniPlayer({ clip, state, articleTitle }: { clip: ArticleAudioClip | null; state: AudioState; articleTitle: string }) {
  const toggle = useToggle(clip?.id ?? -1)
  const show =
    clip !== null && state.access === 'member' && state.phase !== 'idle' && !state.inlineVisible && !state.miniClosed
  const duration = state.duration || clip?.durationSeconds || 0
  const playing = state.phase === 'playing'
  return (
    <div className="aud-mini" data-show={show ? '' : undefined} aria-hidden={show ? undefined : true} role="region" aria-label="Audio player">
      {clip ? (
        <>
          <SeekBar clipId={clip.id} time={state.currentTime} duration={duration} className="aud-mini-bar" />
          <div className="aud-mini-row">
            <button
              type="button"
              className="aud-mini-play"
              onClick={() => void toggle()}
              aria-label={playing ? 'Pause' : 'Play'}
              tabIndex={show ? undefined : -1}
            >
              {state.phase === 'loading' ? <Spinner /> : playing ? <PauseIcon /> : <PlayIcon />}
            </button>
            <button
              type="button"
              className="aud-mini-title"
              onClick={() => audioController.scrollToClip(clip.id)}
              tabIndex={show ? undefined : -1}
            >
              <span className="aud-mini-kicker">
                Now playing<span className="aud-mini-hint"> · back to the section</span>
              </span>
              <span className="aud-mini-name">
                {clip.title} · {articleTitle}
              </span>
            </button>
            <span className="aud-mini-time">
              {formatClock(state.currentTime)} / {formatClock(duration)}
            </span>
            <button type="button" className="aud-speed aud-mini-speed" onClick={() => audioController.cycleSpeed()} tabIndex={show ? undefined : -1}>
              {state.speed}×
            </button>
            <button
              type="button"
              className="aud-mini-follow"
              role="switch"
              aria-checked={state.follow}
              aria-label="Follow along"
              title="Follow along"
              onClick={() => audioController.setFollow(!state.follow)}
              tabIndex={show ? undefined : -1}
            >
              <FollowIcon />
            </button>
            <button
              type="button"
              className="aud-mini-close"
              aria-label="Stop and close the player"
              onClick={() => audioController.closeMini()}
              tabIndex={show ? undefined : -1}
            >
              <CloseIcon />
            </button>
          </div>
        </>
      ) : null}
    </div>
  )
}
