'use client'

import type { GridMetrics, Origin } from '@/lib/grid'
import type { Icon } from '@/lib/types'
import { useCallback, useLayoutEffect, useMemo, useRef } from 'react'
import { Cell } from './Cell'

type Props = {
  cellIcons: (Icon | null)[]
  metrics: GridMetrics
  origin: Origin
  maxDist: number
  ringStepMs: number
  originFromCenter: boolean
  blocked: Set<number> | undefined
  focusedIndex: number | null
  onCopy: (icon: Icon, el: HTMLButtonElement) => void
  onFocusIcon: (icon: Icon, el: HTMLButtonElement) => void
}

type CellGeo = {
  d: string
  dx: string
  dy: string
  ocx: string
  ocy: string
  stroke: string
  alpha: string
}

function buildGeometry(
  metrics: GridMetrics,
  origin: Origin,
  ringStepMs: number,
  anchorEntryAtOrigin: boolean,
  maxDist: number,
): CellGeo[] {
  const { cols, total, cellPx } = metrics
  const geo: CellGeo[] = new Array(total)
  for (let i = 0; i < total; i++) {
    const col = i % cols
    const row = (i / cols) | 0
    const dc = col - origin.col
    const dr = row - origin.row
    const dist = Math.sqrt(dc * dc + dr * dr)
    const mag = dist || 1
    const weight = Math.max(0, Math.min(1, 1 - dist / maxDist))
    // Pixel vector from this cell's CENTER back to the shockwave ORIGIN.
    // Used as the enter layer's transform-origin so new icons scale up
    // from the epicenter (focused cell or grid center) into their resting
    // positions — the core shockwave read.
    const ocxPx = anchorEntryAtOrigin ? -dc * cellPx : 0
    const ocyPx = anchorEntryAtOrigin ? -dr * cellPx : 0
    geo[i] = {
      d: `${Math.round(dist * ringStepMs)}ms`,
      dx: (dc / mag).toFixed(3),
      dy: (dr / mag).toFixed(3),
      ocx: `${ocxPx.toFixed(1)}px`,
      ocy: `${ocyPx.toFixed(1)}px`,
      stroke: (1.1 + weight * 1.3).toFixed(2),
      alpha: (0.4 + weight * 0.6).toFixed(3),
    }
  }
  return geo
}

/**
 * Cells' geometry (delay, direction, offsets, stroke, alpha) is applied via
 * useLayoutEffect + direct DOM writes instead of React props. This lets us
 * re-render cells only when their ICON changes — resize/origin changes no
 * longer trigger 240 React re-renders; they just update CSS custom properties
 * in-place. Big win: resize becomes O(n) property writes, not O(n) reconciles.
 */
export function GridCells({
  cellIcons,
  metrics,
  origin,
  maxDist,
  ringStepMs,
  originFromCenter,
  blocked,
  focusedIndex,
  onCopy,
  onFocusIcon,
}: Props) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const geo = useMemo(
    () => buildGeometry(metrics, origin, ringStepMs, originFromCenter, maxDist),
    [metrics, origin, ringStepMs, originFromCenter, maxDist],
  )

  useLayoutEffect(() => {
    const list = refs.current
    for (let i = 0; i < geo.length; i++) {
      const el = list[i]
      if (!el) continue
      const g = geo[i]
      const s = el.style
      s.setProperty('--d', g.d)
      s.setProperty('--dx', g.dx)
      s.setProperty('--dy', g.dy)
      s.setProperty('--ocx', g.ocx)
      s.setProperty('--ocy', g.ocy)
      s.setProperty('--stroke', g.stroke)
      s.setProperty('--alpha', g.alpha)
    }
  }, [geo])

  const registerRef = useCallback((index: number, el: HTMLButtonElement | null) => {
    refs.current[index] = el
  }, [])

  return (
    <>
      {cellIcons.map((icon, i) => {
        if (blocked?.has(i)) return null
        return (
          <Cell
            key={i}
            index={i}
            icon={icon}
            focused={focusedIndex === i}
            registerRef={registerRef}
            onCopy={onCopy}
            onFocusIcon={onFocusIcon}
          />
        )
      })}
    </>
  )
}
