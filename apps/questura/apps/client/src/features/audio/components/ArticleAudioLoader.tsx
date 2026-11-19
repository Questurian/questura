'use client'

import { useEffect, useState, type ComponentType } from 'react'

import type { ArticleAudio } from '../lib/slots'

type ArticleAudioProps = { audio: ArticleAudio; articleTitle: string; returnTo: string }

/**
 * Loads the audio player only on an article that has AudioClips (ADR-0018).
 * The article routes sit at their first-load JavaScript budget, and most
 * articles have no audio, so the player is its own chunk; until it arrives
 * the server's player shells hold its place.
 */
export function ArticleAudioLoader(props: ArticleAudioProps) {
  const [Player, setPlayer] = useState<ComponentType<ArticleAudioProps> | null>(null)

  useEffect(() => {
    if (!props.audio.clips.length) return
    let cancelled = false
    void import('./ArticleAudio').then((module) => {
      if (!cancelled) setPlayer(() => module.ArticleAudio)
    })
    return () => {
      cancelled = true
    }
  }, [props.audio.clips.length])

  return Player ? <Player {...props} /> : null
}
