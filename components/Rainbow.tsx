'use client'

import { useEffect } from 'react'

/**
 * Vivid display-P3 palette. Each tick the caret takes the next value discretely
 * (no interpolation). New text selections pick a different one at random.
 */
const CARET_PALETTE = [
  'color(display-p3 1 0.05 0.35)',
  'color(display-p3 1 0.45 0)',
  'color(display-p3 1 0.95 0.1)',
  'color(display-p3 0.25 1 0.35)',
  'color(display-p3 0 1 0.95)',
  'color(display-p3 0.2 0.4 1)',
  'color(display-p3 0.75 0.1 1)',
  'color(display-p3 1 0.1 0.75)',
]

const SELECTION_PALETTE = [
  'color(display-p3 1 0.25 0.55)',
  'color(display-p3 1 0.65 0.1)',
  'color(display-p3 1 0.95 0.35)',
  'color(display-p3 0.45 1 0.5)',
  'color(display-p3 0.15 0.95 0.95)',
  'color(display-p3 0.35 0.6 1)',
  'color(display-p3 0.8 0.35 1)',
  'color(display-p3 1 0.45 0.85)',
]

export function Rainbow() {
  useEffect(() => {
    const root = document.documentElement
    let i = Math.floor(Math.random() * CARET_PALETTE.length)
    const tick = () => {
      i = (i + 1) % CARET_PALETTE.length
      root.style.setProperty('--caret', CARET_PALETTE[i])
    }
    root.style.setProperty('--caret', CARET_PALETTE[i])
    // 420ms matches the browser's native caret blink pace so each blink shows a new color
    const id = window.setInterval(tick, 420)

    let lastRange = ''
    const onSelectionChange = () => {
      const sel = window.getSelection()
      if (!sel) return
      const key = `${sel.anchorOffset}:${sel.focusOffset}:${sel.toString().length}`
      if (key === lastRange) return
      lastRange = key
      if (sel.toString().length === 0) return
      const c = SELECTION_PALETTE[Math.floor(Math.random() * SELECTION_PALETTE.length)]
      root.style.setProperty('--selection', c)
    }
    document.addEventListener('selectionchange', onSelectionChange)

    return () => {
      window.clearInterval(id)
      document.removeEventListener('selectionchange', onSelectionChange)
    }
  }, [])
  return null
}
