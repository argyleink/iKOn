'use client'

import { useEffect, useState } from 'react'

/** Short tips — fit in the search input placeholder and the loader alike. */
export const TIPS = [
  'double click to explore similar icons',
  'click to copy an icon',
  'type to search',
  'escape to clear',
  'tab through the grid',
  'press $ for controls',
  'lucide · phosphor · iconoir',
] as const

export const TIP_INTERVAL_MS = 3500

/** Returns the current tip. `active=false` pauses the cycle. */
export function useCyclingTip(active = true, intervalMs = TIP_INTERVAL_MS) {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => {
      setIdx((i) => (i + 1) % TIPS.length)
    }, intervalMs)
    return () => window.clearInterval(id)
  }, [active, intervalMs])
  return { tip: TIPS[idx], idx }
}
