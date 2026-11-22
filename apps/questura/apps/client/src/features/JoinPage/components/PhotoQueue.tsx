'use client'

import { useEffect, useRef } from 'react'

/**
 * Releases A's other photos if the hero photo never arrives (join-page.css,
 * "Photos after the hero"). Normally the hero's own load releases them and
 * this does nothing.
 */
export default function PhotoQueue() {
  const marker = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const root = marker.current?.closest('.jp')
    if (!root) return
    const timer = window.setTimeout(() => root.setAttribute('data-photos-go', ''), 4000)
    return () => window.clearTimeout(timer)
  }, [])
  return <span ref={marker} hidden />
}
