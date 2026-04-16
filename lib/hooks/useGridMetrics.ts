'use client'

import { type GridMetrics, measureGrid } from '@/lib/grid'
import { type RefObject, useEffect, useRef, useState } from 'react'

/**
 * Observes a stage element and returns the current grid metrics.
 *
 * Resize handling uses **rAF throttling, not debounce**. A previous
 * debounce-based implementation (clearTimeout + setTimeout on every RO tick)
 * felt stuck during continuous drag-resize because the timer was canceled on
 * every event and only fired after the user paused for the full debounce
 * duration. rAF throttling instead coalesces all RO events inside the same
 * frame into a single measurement applied on the next frame — smooth 60fps
 * during drag with negligible JS overhead.
 *
 * `debounceMs`, when non-zero, adds a small trailing settle delay after
 * the rAF fires (useful if you want to skip rapid micro-oscillations).
 * Default behavior (debounceMs=0) is pure rAF throttling.
 *
 * The hook also re-measures explicitly when `cellPx` changes — the viewport
 * hasn't resized, but the computed cols/rows depend on cellPx.
 */
export function useGridMetrics(
  stageRef: RefObject<HTMLElement | null>,
  cellPx: number,
  debounceMs: number,
): GridMetrics {
  const [metrics, setMetrics] = useState<GridMetrics>({
    cols: 0,
    rows: 0,
    total: 0,
    cellPx,
  })
  const cellPxRef = useRef(cellPx)
  const debounceRef = useRef(debounceMs)
  cellPxRef.current = cellPx
  debounceRef.current = debounceMs

  useEffect(() => {
    const el = stageRef.current
    if (!el) return

    let rafId: number | null = null
    let settleId: number | null = null

    const measure = () => {
      rafId = null
      const rect = el.getBoundingClientRect()
      const next = measureGrid(rect.width, rect.height, cellPxRef.current)
      setMetrics((prev) =>
        prev.cols === next.cols && prev.rows === next.rows && prev.cellPx === next.cellPx
          ? prev
          : next,
      )
    }

    const schedule = () => {
      // Coalesce all RO events in this frame into one rAF-scheduled measure.
      if (rafId === null) rafId = requestAnimationFrame(measure)
      // Optional trailing settle so the last measure fires after micro-
      // oscillations stop — default debounceMs=0 skips this entirely.
      if (debounceRef.current > 0) {
        if (settleId !== null) window.clearTimeout(settleId)
        settleId = window.setTimeout(() => {
          settleId = null
          if (rafId === null) rafId = requestAnimationFrame(measure)
        }, debounceRef.current)
      }
    }

    // Initial measurement.
    measure()

    const ro = new ResizeObserver(schedule)
    ro.observe(el)

    return () => {
      ro.disconnect()
      if (rafId !== null) cancelAnimationFrame(rafId)
      if (settleId !== null) window.clearTimeout(settleId)
    }
  }, [stageRef])

  // Re-measure when the cell-size slider moves — viewport hasn't changed
  // but cols/rows depend on cellPx.
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setMetrics((prev) => {
      const next = measureGrid(rect.width, rect.height, cellPx)
      return next.cols === prev.cols && next.rows === prev.rows && next.cellPx === prev.cellPx
        ? prev
        : next
    })
  }, [cellPx, stageRef])

  return metrics
}
