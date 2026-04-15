'use client'

import { type GridMetrics, measureGrid } from '@/lib/grid'
import { type RefObject, useEffect, useRef, useState } from 'react'

/**
 * Observes a stage element and returns the current grid metrics. Subscribes to
 * ResizeObserver exactly once; reads the latest cellPx / debounce values via
 * refs so slider changes don't tear down and re-create the observer.
 *
 * Also re-measures explicitly when cellPx changes (slider / config).
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
    let timer: number | null = null
    let lastW = -1
    let lastH = -1

    const apply = () => {
      const rect = el.getBoundingClientRect()
      const w = Math.round(rect.width)
      const h = Math.round(rect.height)
      const cur = cellPxRef.current
      setMetrics((prev) => {
        if (prev.cellPx === cur && w === lastW && h === lastH) return prev
        lastW = w
        lastH = h
        return measureGrid(w, h, cur)
      })
    }

    apply()
    const ro = new ResizeObserver(() => {
      if (timer) window.clearTimeout(timer)
      timer = window.setTimeout(apply, debounceRef.current)
    })
    ro.observe(el)
    return () => {
      ro.disconnect()
      if (timer) window.clearTimeout(timer)
    }
  }, [stageRef])

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
