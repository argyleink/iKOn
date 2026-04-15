'use client'

import { useEffect, useState } from 'react'

/**
 * Returns true only after two rAFs since `active` turned truthy. This gives the
 * browser a chance to commit the "from" state before the "to" state is applied,
 * ensuring CSS transitions fire instead of snapping.
 */
export function useStagedFlag(active: boolean): boolean {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (!active) {
      setReady(false)
      return
    }
    setReady(false)
    let b = 0
    const a = requestAnimationFrame(() => {
      b = requestAnimationFrame(() => setReady(true))
    })
    return () => {
      cancelAnimationFrame(a)
      cancelAnimationFrame(b)
    }
  }, [active])
  return ready
}
