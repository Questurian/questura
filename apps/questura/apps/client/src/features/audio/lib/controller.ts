'use client'

import { get, getBackendUrl, RequestError } from '@/lib/api'

import { slotElementId, type ArticleAudioClip } from './slots'
import { buildSentenceRanges, markNarratedBlocks, type SentenceRanges } from './sentenceRanges'

/**
 * One page, one voice (ADR-0018). The controller owns the page's only audio
 * element, so starting a clip always stops the one before it, and every
 * player (the one under each section and the floating one) draws the same
 * state. Nothing ever plays until the reader presses play.
 *
 * It also keeps the highlight on the sentence being read (CSS Custom
 * Highlights: no change to the article's markup), scrolls with it when
 * Follow along is on, and reports each Listen to the server.
 */

export type ReaderAccess = 'unknown' | 'member' | 'signed-out' | 'not-member'
export type Phase = 'idle' | 'loading' | 'playing' | 'paused' | 'error'

export type AudioState = {
  access: ReaderAccess
  clipId: number | null
  phase: Phase
  currentTime: number
  duration: number
  speed: number
  follow: boolean
  /** The section whose "listen with a membership" panel is open. */
  lockedClipId: number | null
  error: string | null
  /** The current clip's own player is on screen. */
  inlineVisible: boolean
  miniClosed: boolean
  toast: string | null
  positions: Record<number, number>
}

export const SPEEDS = [1, 1.25, 1.5, 2] as const

type PlayInfo = {
  url: string
  expiresAt: number
  durationSeconds: number
  sentences: Array<{ text: string; start: number; end: number }>
}

type ListenRecord = {
  listenId: string
  clipId: number
  ranges: Array<[number, number]>
  secondsHeard: number
  speeds: Set<number>
  finished: boolean
  dirty: boolean
  lastTime: number | null
}

const HIGHLIGHT_NAME = 'audio-now'
const REPORT_EVERY_MS = 15_000

const storage = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = window.localStorage.getItem(`questurian:audio:${key}`)
      return raw === null ? fallback : (JSON.parse(raw) as T)
    } catch {
      return fallback
    }
  },
  set(key: string, value: unknown) {
    try {
      window.localStorage.setItem(`questurian:audio:${key}`, JSON.stringify(value))
    } catch {
      // Private windows and full storage: the setting just is not remembered.
    }
  },
}

function newListenId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `l-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

export class AudioController {
  private state: AudioState
  private readonly listeners = new Set<() => void>()
  private audio: HTMLAudioElement | null = null
  private clips = new Map<number, ArticleAudioClip>()
  private articleTitle = ''
  private info = new Map<number, PlayInfo>()
  private ranges = new Map<number, SentenceRanges>()
  private sentenceIndex = -1
  private listens = new Map<number, ListenRecord>()
  private reportTimer: ReturnType<typeof setInterval> | null = null
  private autoScrollAt = 0
  private toastTimer: ReturnType<typeof setTimeout> | null = null
  private unmarkBlocks: (() => void) | null = null
  private pendingSeek: number | null = null

  constructor() {
    this.state = {
      access: 'unknown',
      clipId: null,
      phase: 'idle',
      currentTime: 0,
      duration: 0,
      speed: 1,
      follow: false,
      lockedClipId: null,
      error: null,
      inlineVisible: true,
      miniClosed: false,
      toast: null,
      positions: {},
    }
  }

  // ---- store plumbing ----------------------------------------------------

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = () => this.state

  private set(patch: Partial<AudioState>) {
    this.state = { ...this.state, ...patch }
    for (const listener of this.listeners) listener()
  }

  // ---- setup -------------------------------------------------------------

  attach(clips: ArticleAudioClip[], articleTitle: string) {
    this.clips = new Map(clips.map((clip) => [clip.id, clip]))
    this.articleTitle = articleTitle
    const speed = storage.get<number>('speed', 1)
    this.set({
      speed: (SPEEDS as readonly number[]).includes(speed) ? speed : 1,
      follow: storage.get<boolean>('follow', false),
    })
    window.addEventListener('pagehide', this.flushOnLeave)
    document.addEventListener('visibilitychange', this.onVisibility)
    for (const event of ['wheel', 'touchmove', 'keydown'] as const) {
      window.addEventListener(event, this.onManualScroll, { passive: true })
    }
  }

  detach() {
    this.flush(true)
    this.audio?.pause()
    window.removeEventListener('pagehide', this.flushOnLeave)
    document.removeEventListener('visibilitychange', this.onVisibility)
    for (const event of ['wheel', 'touchmove', 'keydown'] as const) {
      window.removeEventListener(event, this.onManualScroll)
    }
    this.clearHighlight()
  }

  setAccess(access: ReaderAccess) {
    if (access === this.state.access) return
    this.set({ access, lockedClipId: access === 'member' ? null : this.state.lockedClipId })
    if (access !== 'member' && this.audio && !this.audio.paused) this.audio.pause()
  }

  setInlineVisible(visible: boolean) {
    if (visible !== this.state.inlineVisible) this.set({ inlineVisible: visible })
  }

  /** The page's DOM changed (a member's full body arrived): match the sentences again. */
  invalidateRanges() {
    this.ranges.clear()
    this.sentenceIndex = -1
    this.unmarkBlocks?.()
    this.unmarkBlocks = null
    if (this.state.clipId !== null) this.updateSentence(true)
  }

  // ---- reader actions ----------------------------------------------------

  toggle(clipId: number) {
    const { access } = this.state
    if (access !== 'member') {
      this.set({ lockedClipId: this.state.lockedClipId === clipId ? null : clipId })
      return
    }
    if (this.state.clipId !== clipId) {
      void this.start(clipId)
      return
    }
    const audio = this.audio
    if (!audio) return
    if (audio.paused) {
      this.set({ miniClosed: false })
      void audio.play().catch(() => this.set({ phase: 'paused' }))
    } else {
      audio.pause()
    }
  }

  seek(clipId: number, seconds: number) {
    if (this.state.access !== 'member') return
    const clip = this.clips.get(clipId)
    if (!clip) return
    const target = Math.max(0, Math.min(seconds, clip.durationSeconds))
    if (this.state.clipId !== clipId || !this.audio) {
      this.set({ positions: { ...this.state.positions, [clipId]: target } })
      return
    }
    this.audio.currentTime = target
    const listen = this.listens.get(clipId)
    if (listen) listen.lastTime = null
    this.set({ currentTime: target })
    this.updateSentence(true)
  }

  cycleSpeed() {
    const index = (SPEEDS as readonly number[]).indexOf(this.state.speed)
    const speed = SPEEDS[(index + 1) % SPEEDS.length]
    storage.set('speed', speed)
    if (this.audio) this.audio.playbackRate = speed
    this.set({ speed })
  }

  setFollow(follow: boolean, announce = true) {
    storage.set('follow', follow)
    this.set({ follow })
    if (announce) this.showToast(follow ? 'Follow along on' : 'Follow along off')
    if (follow) this.followSentence(true)
  }

  closeMini() {
    this.audio?.pause()
    this.set({ miniClosed: true })
  }

  closeLock() {
    this.set({ lockedClipId: null })
  }

  scrollToClip(clipId: number | null) {
    const clip = clipId === null ? null : this.clips.get(clipId)
    if (!clip) return
    const target = document.getElementById(slotElementId(clip.sectionKey))
    if (!target) return
    this.autoScrollAt = Date.now()
    window.scrollTo({ top: window.scrollY + target.getBoundingClientRect().top - 96, behavior: 'smooth' })
  }

  // ---- playback ----------------------------------------------------------

  private ensureAudio(): HTMLAudioElement {
    if (this.audio) return this.audio
    const audio = new Audio()
    audio.preload = 'auto'
    audio.addEventListener('playing', () => {
      this.set({ phase: 'playing', error: null })
      this.startReporting()
    })
    audio.addEventListener('timeupdate', this.onTime)
    audio.addEventListener('pause', () => {
      if (this.state.phase !== 'idle') this.set({ phase: 'paused' })
      this.stopReporting()
      this.flush(false)
    })
    audio.addEventListener('waiting', () => this.set({ phase: 'loading' }))
    audio.addEventListener('seeked', () => {
      const listen = this.state.clipId === null ? null : this.listens.get(this.state.clipId)
      if (listen) listen.lastTime = audio.currentTime
    })
    audio.addEventListener('loadedmetadata', () => {
      if (this.pendingSeek !== null) {
        audio.currentTime = this.pendingSeek
        this.pendingSeek = null
      }
    })
    audio.addEventListener('ended', () => {
      const clipId = this.state.clipId
      if (clipId === null) return
      const listen = this.listens.get(clipId)
      if (listen) {
        listen.finished = true
        listen.dirty = true
      }
      this.flush(false)
      this.set({ phase: 'paused', currentTime: 0, positions: { ...this.state.positions, [clipId]: 0 } })
      audio.currentTime = 0
      this.clearHighlight()
    })
    audio.addEventListener('error', () => {
      if (this.state.clipId === null) return
      // An expired link is the usual cause: fetch a new one next time.
      this.info.delete(this.state.clipId)
      this.set({ phase: 'error', error: 'The audio could not load. Press play to try again.' })
    })
    this.audio = audio
    return audio
  }

  private async playInfo(clipId: number): Promise<PlayInfo> {
    const cached = this.info.get(clipId)
    if (cached && cached.expiresAt * 1000 - Date.now() > 60_000) return cached
    const fresh = await get<PlayInfo>(`/api/public/audio/play?clip=${clipId}`)
    this.info.set(clipId, fresh)
    this.ranges.delete(clipId)
    return fresh
  }

  private async start(clipId: number) {
    const clip = this.clips.get(clipId)
    if (!clip) return
    const audio = this.ensureAudio()
    const previous = this.state.clipId
    if (previous !== null && previous !== clipId) {
      audio.pause()
      this.flush(false)
      this.clearHighlight()
    }
    const position = this.state.positions[clipId] ?? 0
    this.sentenceIndex = -1
    this.set({
      clipId,
      phase: 'loading',
      error: null,
      currentTime: position,
      duration: clip.durationSeconds,
      lockedClipId: null,
      miniClosed: false,
      positions: previous !== null ? { ...this.state.positions, [previous]: audio.currentTime } : this.state.positions,
    })

    let info: PlayInfo
    try {
      info = await this.playInfo(clipId)
    } catch (error) {
      if (this.state.clipId !== clipId) return
      const status = error instanceof RequestError ? error.status : null
      if (status === 401 || status === 403) {
        // The membership ended or the session did since the page was read.
        this.set({ phase: 'idle', clipId: null, access: status === 401 ? 'signed-out' : 'not-member', lockedClipId: clipId })
        return
      }
      this.set({ phase: 'error', error: 'The audio could not load. Press play to try again.' })
      return
    }
    if (this.state.clipId !== clipId) return

    audio.src = info.url
    audio.playbackRate = this.state.speed
    this.pendingSeek = position > 0 ? position : null
    this.set({ duration: info.durationSeconds || clip.durationSeconds })
    this.setMediaSession(clip)
    this.openListen(clipId)
    try {
      await audio.play()
    } catch {
      if (this.state.clipId === clipId) this.set({ phase: 'paused' })
    }
  }

  /**
   * The audio element's own clock, about four times a second. Not
   * requestAnimationFrame: browsers pause that in background tabs, and people
   * listen with the tab hidden or the phone locked, which is exactly when the
   * Listen must keep counting.
   */
  private onTime = () => {
    const audio = this.audio
    const clipId = this.state.clipId
    if (!audio || clipId === null) return
    if (!audio.paused) this.trackHeard(audio.currentTime)
    if (Math.abs(audio.currentTime - this.state.currentTime) >= 0.1) {
      this.set({ currentTime: audio.currentTime, positions: { ...this.state.positions, [clipId]: audio.currentTime } })
    }
    this.updateSentence(false)
  }

  private setMediaSession(clip: ArticleAudioClip) {
    if (!('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return
    navigator.mediaSession.metadata = new MediaMetadata({
      title: clip.title,
      artist: 'Questurian',
      album: this.articleTitle,
    })
    navigator.mediaSession.setActionHandler('play', () => this.state.clipId !== null && this.toggle(this.state.clipId))
    navigator.mediaSession.setActionHandler('pause', () => this.audio?.pause())
    navigator.mediaSession.setActionHandler('seekbackward', () => this.audio && this.seek(clip.id, this.audio.currentTime - 10))
    navigator.mediaSession.setActionHandler('seekforward', () => this.audio && this.seek(clip.id, this.audio.currentTime + 10))
  }

  // ---- highlight, section mark and Follow along --------------------------

  private rangesFor(clipId: number): SentenceRanges | null {
    const cached = this.ranges.get(clipId)
    if (cached) return cached
    const clip = this.clips.get(clipId)
    const info = this.info.get(clipId)
    if (!clip || !info) return null
    const built = buildSentenceRanges(clip.sectionKey, info.sentences.map((sentence) => sentence.text))
    if (built) this.ranges.set(clipId, built)
    return built
  }

  private updateSentence(force: boolean) {
    const clipId = this.state.clipId
    const info = clipId === null ? null : this.info.get(clipId)
    const audio = this.audio
    if (clipId === null || !info || !audio) return
    // Finished, or not started: nothing is being read, so nothing is marked.
    if (audio.ended || (audio.paused && audio.currentTime < 0.05)) {
      this.clearHighlight()
      return
    }
    const ranges = this.rangesFor(clipId)
    if (!ranges) return
    if (!this.unmarkBlocks) this.unmarkBlocks = markNarratedBlocks(ranges)

    const time = audio.currentTime
    const index = info.sentences.findIndex((sentence, i) => {
      const next = info.sentences[i + 1]
      return time >= sentence.start - 0.05 && (next ? time < next.start - 0.05 : time <= sentence.end + 0.5)
    })
    if (index === this.sentenceIndex && !force) return
    this.sentenceIndex = index
    const range = index >= 0 ? ranges.ranges[index] : null
    this.setHighlight(range)
    if (range && this.state.follow && !audio.paused) this.followSentence(false)
  }

  private setHighlight(range: Range | null) {
    const registry = (globalThis as { CSS?: { highlights?: Map<string, unknown> } }).CSS?.highlights
    const HighlightCtor = (globalThis as { Highlight?: new (...ranges: Range[]) => unknown }).Highlight
    if (!registry || !HighlightCtor) return
    if (range) registry.set(HIGHLIGHT_NAME, new HighlightCtor(range))
    else registry.delete(HIGHLIGHT_NAME)
  }

  private clearHighlight() {
    this.setHighlight(null)
    this.unmarkBlocks?.()
    this.unmarkBlocks = null
    this.sentenceIndex = -1
  }

  private followSentence(force: boolean) {
    const clipId = this.state.clipId
    if (clipId === null || this.sentenceIndex < 0) return
    const range = this.ranges.get(clipId)?.ranges[this.sentenceIndex]
    if (!range) return
    const rect = range.getBoundingClientRect()
    const height = window.innerHeight
    if (!force && rect.top > height * 0.18 && rect.bottom < height * 0.68) return
    this.autoScrollAt = Date.now()
    window.scrollTo({ top: window.scrollY + rect.top - height * 0.32, behavior: 'smooth' })
  }

  /** A reader who scrolls on their own takes the page back: Follow along turns off. */
  private onManualScroll = (event: Event) => {
    if (!this.state.follow || !this.audio || this.audio.paused) return
    if (Date.now() - this.autoScrollAt < 600) return
    if (event instanceof KeyboardEvent) {
      if (!['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) return
      const target = event.target as HTMLElement | null
      if (target?.closest('button, input, textarea, select, [contenteditable]')) return
    }
    this.set({ follow: false })
    storage.set('follow', false)
    this.showToast('Follow along off: you scrolled')
  }

  private showToast(message: string) {
    if (this.toastTimer) clearTimeout(this.toastTimer)
    this.set({ toast: message })
    this.toastTimer = setTimeout(() => this.set({ toast: null }), 1800)
  }

  // ---- Listens -----------------------------------------------------------

  /** One Listen per clip per visit to the page: pausing and resuming keeps it. */
  private openListen(clipId: number) {
    if (this.listens.has(clipId)) return
    this.listens.set(clipId, {
      listenId: newListenId(),
      clipId,
      ranges: [],
      secondsHeard: 0,
      speeds: new Set([this.state.speed]),
      finished: false,
      dirty: true,
      lastTime: null,
    })
  }

  private trackHeard(time: number) {
    const clipId = this.state.clipId
    const listen = clipId === null ? null : this.listens.get(clipId)
    if (!listen) return
    listen.speeds.add(this.state.speed)
    const last = listen.lastTime
    listen.lastTime = time
    if (last === null || time <= last || time - last > 1.5) return
    listen.secondsHeard += time - last
    const open = listen.ranges[listen.ranges.length - 1]
    if (open && Math.abs(open[1] - last) < 0.6) open[1] = time
    else listen.ranges.push([last, time])
    listen.dirty = true
  }

  private startReporting() {
    this.stopReporting()
    this.flush(false)
    this.reportTimer = setInterval(() => this.flush(false), REPORT_EVERY_MS)
  }

  private stopReporting() {
    if (this.reportTimer) clearInterval(this.reportTimer)
    this.reportTimer = null
  }

  private flushOnLeave = () => this.flush(true)

  private onVisibility = () => {
    if (document.visibilityState === 'hidden') this.flush(true)
  }

  private flush(leaving: boolean) {
    for (const listen of this.listens.values()) {
      if (!listen.dirty) continue
      listen.dirty = false
      const body = JSON.stringify({
        listenId: listen.listenId,
        clipId: listen.clipId,
        secondsHeard: Math.round(listen.secondsHeard * 10) / 10,
        ranges: listen.ranges.map(([from, to]) => [Math.round(from * 10) / 10, Math.round(to * 10) / 10]),
        speeds: [...listen.speeds],
        finished: listen.finished,
      })
      // text/plain keeps it a simple request, so a closing page can still send it.
      void fetch(`${getBackendUrl()}/api/public/audio/listens`, {
        method: 'POST',
        credentials: 'include',
        keepalive: leaving,
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body,
      }).catch(() => {
        listen.dirty = true
      })
    }
  }
}

export const audioController = new AudioController()
