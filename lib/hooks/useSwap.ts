'use client'

import type { Icon } from '@/lib/types'
import { useState } from 'react'

/**
 * Tracks current + previous icon with zero effects.
 *
 * When the prop changes, we shift the outgoing icon into `prev` via a
 * render-time state update (React permits this because the condition becomes
 * false on the follow-up render). `prev` is not timed out — it's replaced on
 * the next change and its layer stays out of view until then.
 *
 * The old → new transition itself is fully declarative: both layers are
 * re-keyed (`in-<id>` / `out-<id>`) so React mounts fresh elements, and CSS
 * `@starting-style` in Cell.module.css defines the "from" state. No effect,
 * no rAF dance, no staged-flag race — the browser schedules the transition at
 * mount time, which is precisely what we want for a wave that starts the
 * instant a swap is committed.
 */
export function useSwap(icon: Icon | null): { current: Icon | null; prev: Icon | null } {
  const [state, setState] = useState<{ current: Icon | null; prev: Icon | null }>(() => ({
    current: icon,
    prev: null,
  }))

  if (state.current?.id !== icon?.id) {
    setState((s) => ({ current: icon, prev: s.current }))
  }

  return state
}
