'use client'

import { useEffect } from 'react'

/**
 * Display-P3 palettes used globally for text selection (`--selection`) and
 * for the focused-cell outline (`--outline`).
 *
 * The selection palette advances on each new non-empty text selection; the
 * outline palette advances on each new cell/button focus. Both cycle through
 * the palette (with a random rotation offset per palette) so consecutive
 * colors are always different — the previous behavior was random, which
 * occasionally picked the same color twice in a row.
 *
 * The caret color is NOT handled here anymore — it's local to the search
 * input. Global color churn on :root was writing on every tick, which is
 * wasteful and bled into any future consumer of --caret.
 */
const SELECTION_PALETTE = [
  'color(display-p3 1 0.25 0.55)',
  'color(display-p3 1 0.65 0.1)',
  'color(display-p3 1 0.95 0.35)',
  'color(display-p3 0.45 1 0.5)',
  'color(display-p3 0.15 0.95 0.95)',
  'color(display-p3 0.35 0.6 1)',
  'color(display-p3 0.8 0.35 1)',
  'color(display-p3 1 0.45 0.85)',
] as const

const OUTLINE_PALETTE = [
  'color(display-p3 1 0.1 0.45)',
  'color(display-p3 1 0.5 0.05)',
  'color(display-p3 1 0.9 0.15)',
  'color(display-p3 0.3 1 0.4)',
  'color(display-p3 0.05 0.95 0.9)',
  'color(display-p3 0.25 0.5 1)',
  'color(display-p3 0.75 0.2 1)',
  'color(display-p3 1 0.2 0.8)',
] as const

export function Rainbow() {
  useEffect(() => {
    const root = document.documentElement

    // Selection: step through on every new non-empty selection. The palette
    // index only advances when a DIFFERENT selection event fires with new
    // content, so consecutive selections always get a different color.
    let selectionIdx = Math.floor(Math.random() * SELECTION_PALETTE.length)
    root.style.setProperty('--selection', SELECTION_PALETTE[selectionIdx])
    let lastRange = ''
    const onSelectionChange = () => {
      const sel = window.getSelection()
      if (!sel) return
      const key = `${sel.anchorOffset}:${sel.focusOffset}:${sel.toString().length}`
      if (key === lastRange) return
      lastRange = key
      if (sel.toString().length === 0) return
      selectionIdx = (selectionIdx + 1) % SELECTION_PALETTE.length
      root.style.setProperty('--selection', SELECTION_PALETTE[selectionIdx])
    }
    document.addEventListener('selectionchange', onSelectionChange)

    // Outline: advance on every focus change so each newly-focused element
    // shows a color distinct from the previous one. We set the var on :root
    // so it cascades to any focusable that consumes var(--outline).
    let outlineIdx = Math.floor(Math.random() * OUTLINE_PALETTE.length)
    root.style.setProperty('--outline', OUTLINE_PALETTE[outlineIdx])
    let lastFocus: EventTarget | null = null
    const onFocusIn = (e: FocusEvent) => {
      if (e.target === lastFocus) return
      lastFocus = e.target
      outlineIdx = (outlineIdx + 1) % OUTLINE_PALETTE.length
      root.style.setProperty('--outline', OUTLINE_PALETTE[outlineIdx])
    }
    document.addEventListener('focusin', onFocusIn)

    return () => {
      document.removeEventListener('selectionchange', onSelectionChange)
      document.removeEventListener('focusin', onFocusIn)
    }
  }, [])

  return null
}
