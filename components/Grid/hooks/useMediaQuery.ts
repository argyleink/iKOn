'use client'

import { useEffect, useState } from 'react'

/**
 * Reactive boolean for a CSS media query. Returns `false` on the server
 * (and on the very first client render) so hydration stays consistent —
 * the real match flips in on the first effect pass.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(query)
    setMatches(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])
  return matches
}
