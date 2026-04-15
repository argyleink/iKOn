'use client'

import type { Icon } from '@/lib/types'
import { useEffect, useRef, useState } from 'react'

/**
 * Tracks the outgoing icon without feedback loops.
 *
 * We detect prop changes during render (React explicitly allows setting state
 * of the currently-rendering component as long as it's guarded by a condition
 * that becomes false after the update). Then a single effect clears `prev`
 * after the exit-animation window.
 *
 * The previous implementation set state inside useEffect with a ref-read, which
 * in some dev-mode double-invocation paths tripped React 19's max-update-depth
 * detector when effects re-ran before cleanup settled.
 */
export function useSwap(icon: Icon | null): { current: Icon | null; prev: Icon | null } {
  const [prev, setPrev] = useState<Icon | null>(null)
  const lastIconRef = useRef<Icon | null>(icon)

  if (lastIconRef.current?.id !== icon?.id) {
    setPrev(lastIconRef.current)
    lastIconRef.current = icon
  }

  useEffect(() => {
    if (!prev) return
    const t = window.setTimeout(() => setPrev(null), 1600)
    return () => window.clearTimeout(t)
  }, [prev])

  return { current: icon, prev }
}
