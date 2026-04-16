'use client'

import { type RefObject, useEffect } from 'react'

/**
 * Cycles the app's `--selection` CSS custom property through a display-P3
 * palette on every new non-empty text selection. Because the value is
 * written onto a single element (the `<main>` root), everything underneath
 * that reads `var(--selection)` stays in lockstep — the native `::selection`
 * highlight in globals.css AND the contextual chip icon in SearchInput
 * both pick up the current color for free.
 *
 * React-wise: this is a side-effect with no render dependency (the color
 * never becomes React state), so a plain `useEffect` that manages the
 * document listener is the right shape. Components that want to react
 * visually just read the CSS variable.
 */

const P3_PALETTE = [
  'color(display-p3 1 0.25 0.55)',
  'color(display-p3 1 0.65 0.1)',
  'color(display-p3 1 0.95 0.35)',
  'color(display-p3 0.45 1 0.5)',
  'color(display-p3 0.15 0.95 0.95)',
  'color(display-p3 0.35 0.6 1)',
  'color(display-p3 0.8 0.35 1)',
  'color(display-p3 1 0.45 0.85)',
]

export function useSelectionColor(targetRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = targetRef.current
    if (!el) return

    let idx = Math.floor(Math.random() * P3_PALETTE.length)
    let lastRange = ''

    const onSelection = () => {
      const sel = window.getSelection()
      if (!sel) return
      // Dedupe: `selectionchange` fires on every caret move, not just on
      // actual range changes. A stable anchor/focus/length signature skips
      // the no-op cases so we only advance on a genuinely new selection.
      const key = `${sel.anchorOffset}:${sel.focusOffset}:${sel.toString().length}`
      if (key === lastRange) return
      lastRange = key
      if (sel.toString().length === 0) return
      idx = (idx + 1) % P3_PALETTE.length
      el.style.setProperty('--selection', P3_PALETTE[idx])
    }

    document.addEventListener('selectionchange', onSelection)
    return () => document.removeEventListener('selectionchange', onSelection)
  }, [targetRef])
}
