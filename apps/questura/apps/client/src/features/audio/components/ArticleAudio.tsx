'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

import Link from '@/components/navigation/PublicLink'
import { identityStore, SHARED_IDENTITY_MAX_AGE_MS } from '@/lib/user/currentIdentity'
import { identityFromResponse } from '@/lib/user/identity'

import { audioController, TEXT_FOLLOW_ENABLED, type AudioState, type ReaderAccess } from '../lib/controller'
import {
  formatClock,
  formatPlayerClock,
  headerSlotElementId,
  listenMinutesLabel,
  slotElementId,
  type ArticleAudio as ArticleAudioData,
  type ArticleAudioClip,
} from '../lib/slots'

/**
 * The article's audio, once loaded (ADR-0018, amended 2026-11-19): the
 * "Listen" line above the article's text that opens into the player row, the
 * floating player, and the "listen with a membership" panel. Every player draws the one controller's state.
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

/** The dark header's quiet Listen box, if the page has one. The header is drawn once, so one look is enough. */
function useHeaderSlots(clips: ArticleAudioClip[]) {
  const [slots, setSlots] = useState<Map<string, HTMLElement>>(new Map())
  const keys = clips.map((clip) => clip.sectionKey).join('|')
  useEffect(() => {
    const scan = () => {
      const found = new Map<string, HTMLElement>()
      for (const clip of clips) {
        const element = document.getElementById(headerSlotElementId(clip.sectionKey))
        if (element) {
          element.setAttribute('data-ready', '')
          found.set(clip.sectionKey, element)
        }
      }
      setSlots(found)
    }
    scan()
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
  const headerSlots = useHeaderSlots(audio.clips)

  return (
    <>
      {audio.clips.map((clip) => {
        const slot = slots.get(clip.sectionKey)
        return slot
          ? createPortal(<ListenPlayer key={clip.id} clip={clip} state={state} returnTo={returnTo} />, slot)
          : null
      })}
      {audio.clips.map((clip) => {
        const slot = headerSlots.get(clip.sectionKey)
        return slot ? createPortal(<HeaderListenButton key={clip.id} clip={clip} state={state} />, slot) : null
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
const FollowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 5v14M5 12l7 7 7-7" /></svg>
)
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
)
/** A circular arrow with "15" in it: back (`flip`) or forward fifteen seconds. */
const SkipIcon = ({ back }: { back?: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
    <g transform={back ? undefined : 'translate(24 0) scale(-1 1)'}>
      <path d="M5.2 8.2A8 8 0 1 1 4 12.5" strokeLinecap="round" />
      <path d="M5 3.8v4.6h4.6" strokeLinecap="round" strokeLinejoin="round" />
    </g>
    <text x="12" y="15.2" textAnchor="middle" fontSize="8.2" fontWeight="700" fill="currentColor" stroke="none">
      15
    </text>
  </svg>
)
const Spinner = () => <span className="aud-spinner" aria-hidden="true" />

// ---- pieces ----------------------------------------------------------------

function useToggle(clipId: number) {
  return useCallback(async () => {
    if (audioController.getSnapshot().access === 'unknown') audioController.setAccess(await readAccess())
    audioController.toggle(clipId)
  }, [clipId])
}

function SeekBar({
  clipId,
  time,
  duration,
  className,
  children,
}: {
  clipId: number
  time: number
  duration: number
  className: string
  children?: ReactNode
}) {
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
      {children}
    </div>
  )
}

/**
 * The player above the article's text: a "Listen · N minutes" line until it is
 * pressed, then one row: play/pause, the time heard, the progress line, the
 * length, back and forward fifteen seconds, and the speed. A non-member's
 * press opens the membership panel.
 */
function ListenPlayer({ clip, state, returnTo }: { clip: ArticleAudioClip; state: AudioState; returnTo: string }) {
  const toggle = useToggle(clip.id)
  const [opened, setOpened] = useState(false)
  const member = state.access === 'member'
  const isCurrent = state.clipId === clip.id
  const playing = isCurrent && state.phase === 'playing'
  const loading = isCurrent && state.phase === 'loading'
  const time = isCurrent ? state.currentTime : state.positions[clip.id] ?? 0
  const duration = isCurrent && state.duration ? state.duration : clip.durationSeconds
  const expanded = member && (opened || isCurrent || time > 0)
  const lockOpen = !member && state.lockedClipId === clip.id

  const press = () => {
    setOpened(true)
    void toggle()
  }

  return (
    <div className="aud-player" data-expanded={expanded ? '' : undefined}>
      {expanded ? (
        <div className="aud-row">
          <button type="button" className="aud-play" onClick={press} aria-label={playing ? 'Pause' : 'Play'}>
            {loading ? <Spinner /> : playing ? <PauseIcon /> : <PlayIcon />}
          </button>
          <span className="aud-clock" aria-hidden="true">
            {formatPlayerClock(time, duration)}
          </span>
          <SeekBar clipId={clip.id} time={time} duration={duration} className="aud-line" />
          <span className="aud-clock" aria-hidden="true">
            {formatPlayerClock(duration)}
          </span>
          <div className="aud-tools">
            <button
              type="button"
              className="aud-skip"
              aria-label="Back 15 seconds"
              title="Back 15 seconds"
              onClick={() => audioController.seek(clip.id, time - 15)}
            >
              <SkipIcon back />
            </button>
            <button
              type="button"
              className="aud-skip"
              aria-label="Forward 15 seconds"
              title="Forward 15 seconds"
              onClick={() => audioController.seek(clip.id, time + 15)}
            >
              <SkipIcon />
            </button>
            <button
              type="button"
              className="aud-speed"
              onClick={() => audioController.cycleSpeed()}
              aria-label={`Speed ${state.speed} times`}
            >
              {state.speed}x
            </button>
            {TEXT_FOLLOW_ENABLED ? (
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
            ) : null}
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="aud-listen"
          onClick={press}
          aria-label={`Listen to this article, ${listenMinutesLabel(clip.durationSeconds)}${member ? '' : ': members only'}`}
          aria-expanded={!member ? lockOpen : undefined}
        >
          <span className="aud-listen-icon">
            <PlayIcon />
          </span>
          <span className="aud-listen-word">Listen</span>
          <span className="aud-listen-length">{listenMinutesLabel(clip.durationSeconds)}</span>
        </button>
      )}
      {isCurrent && state.phase === 'error' && state.error ? <div className="aud-error">{state.error}</div> : null}
      {lockOpen ? <LockPanel access={state.access} returnTo={`${returnTo}#${slotElementId(clip.sectionKey)}`} /> : null}
    </div>
  )
}

/**
 * The quiet Listen box in a dark header: the same recording as the line above
 * the text. A member's press plays or pauses it (that line opens into the
 * player); a non-member's press opens the membership panel there and goes to it.
 */
function HeaderListenButton({ clip, state }: { clip: ArticleAudioClip; state: AudioState }) {
  const toggle = useToggle(clip.id)
  const playing = state.clipId === clip.id && state.phase === 'playing'
  const press = async () => {
    await toggle()
    const after = audioController.getSnapshot()
    if (after.access !== 'member' && after.lockedClipId === clip.id) audioController.scrollToClip(clip.id)
  }
  return (
    <button
      type="button"
      className="aud-header-box"
      onClick={() => void press()}
      aria-label={playing ? 'Pause' : `Listen to this article, ${listenMinutesLabel(clip.durationSeconds)}`}
    >
      {playing ? <PauseIcon /> : <PlayIcon />}
      {playing ? 'Pause' : 'Listen'}
    </button>
  )
}

function LockPanel({ access, returnTo }: { access: ReaderAccess; returnTo: string }) {
  const href = `/join?returnTo=${encodeURIComponent(returnTo)}`
  const signedIn = access === 'not-member'
  return (
    <div className="aud-lock" role="region" aria-label="Members-only audio">
      <div className="aud-lock-title">Listen with a Questurian membership</div>
      <div className="aud-lock-text">
        Members can listen to our guides, read aloud.
      </div>
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
                Now playing<span className="aud-mini-hint"> · back to the top</span>
              </span>
              <span className="aud-mini-name">{articleTitle}</span>
            </button>
            <span className="aud-mini-time">
              {formatClock(state.currentTime)} / {formatClock(duration)}
            </span>
            <button type="button" className="aud-speed aud-mini-speed" onClick={() => audioController.cycleSpeed()} tabIndex={show ? undefined : -1}>
              {state.speed}x
            </button>
            {TEXT_FOLLOW_ENABLED ? (
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
            ) : null}
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
