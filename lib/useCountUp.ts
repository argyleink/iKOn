'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Tween a displayed number toward a target using rAF with an eased curve.
 * Duration scales slightly with distance so small changes feel snappy and
 * large jumps feel substantial.
 */
export function useCountUp(target: number, baseDurationMs = 420): number {
  const [display, setDisplay] = useState(target)
  const fromRef = useRef(target)
  const rafRef = useRef(0)

  useEffect(() => {
    const from = fromRef.current
    if (from === target) return
    const delta = Math.abs(target - from)
    const duration = Math.min(1200, baseDurationMs + Math.min(600, delta * 0.6))
    const start = performance.now()

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - (1 - t) ** 3
      const v = Math.round(from + (target - from) * eased)
      setDisplay(v)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        fromRef.current = target
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, baseDurationMs])

  return display
}
