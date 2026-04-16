'use client'

import { type RefObject, useEffect, useRef, useState } from 'react'
import { type GridMetrics, measureGrid } from '../metrics'

/**
 * Observes a stage element and returns the current grid metrics. Uses rAF
 * throttling so continuous resizes update every frame without debounce lag.
 * Also re-measures explicitly when `cellPx` changes.
 */
export function useGridMetrics(
  stageRef: RefObject<HTMLElement | null>,
  cellPx: number,
): GridMetrics {
  const [metrics, setMetrics] = useState<GridMetrics>({
    cols: 0,
    rows: 0,
    total: 0,
    cellPx,
  })
  const cellPxRef = useRef(cellPx)
  cellPxRef.current = cellPx

  useEffect(() => {
    const el = stageRef.current
    if (!el) return

    let rafId: number | null = null

    const measure = () => {
      rafId = null
      const rect = el.getBoundingClientRect()
      const next = measureGrid(rect.width, rect.height, cellPxRef.current)
      setMetrics((prev: GridMetrics) =>
        prev.cols === next.cols && prev.rows === next.rows && prev.cellPx === next.cellPx
          ? prev
          : next,
      )
    }

    measure()

    const ro = new ResizeObserver(() => {
      if (rafId === null) rafId = requestAnimationFrame(measure)
    })
    ro.observe(el)

    return () => {
      ro.disconnect()
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [stageRef])

  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setMetrics((prev: GridMetrics) => {
      const next = measureGrid(rect.width, rect.height, cellPx)
      return next.cols === prev.cols && next.rows === prev.rows && next.cellPx === prev.cellPx
        ? prev
        : next
    })
  }, [cellPx, stageRef])

  return metrics
}
