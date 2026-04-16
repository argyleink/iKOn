'use client'

import type { Icon } from '@/lib/icons'
import { useMemo } from 'react'
import { Cell, type CellGeometry } from '../Cell'
import type { GridMetrics, Origin } from '../metrics'

type Props = {
  cellIcons: (Icon | null)[]
  metrics: GridMetrics
  origin: Origin
  maxDist: number
  ringStepMs: number
  blocked: Set<number> | undefined
  onCopy: (icon: Icon, el: HTMLButtonElement) => void
  onFocusIcon: (icon: Icon, el: HTMLButtonElement) => void
}

function buildGeometry(
  metrics: GridMetrics,
  origin: Origin,
  ringStepMs: number,
  maxDist: number,
): CellGeometry[] {
  const { cols, total } = metrics
  const geo: CellGeometry[] = new Array(total)
  for (let i = 0; i < total; i++) {
    const col = i % cols
    const row = (i / cols) | 0
    const dc = col - origin.col
    const dr = row - origin.row
    const dist = Math.sqrt(dc * dc + dr * dr)
    const weight = Math.max(0, Math.min(1, 1 - dist / maxDist))
    geo[i] = {
      d: `${Math.round(dist * ringStepMs)}ms`,
      stroke: (1.1 + weight * 1.3).toFixed(2),
      alpha: (0.15 + weight * 0.85).toFixed(3),
      // Tabindex by distance: cells start at 3 so the search input
      // (tabindex=1) and nearby buttons (chip / clear, tabindex=2) are
      // reachable from the input before the grid cells. Center = 3,
      // next ring = 4, etc.
      tab: Math.round(dist) + 3,
    }
  }
  return geo
}

export function GridCells({
  cellIcons,
  metrics,
  origin,
  maxDist,
  ringStepMs,
  blocked,
  onCopy,
  onFocusIcon,
}: Props) {
  const geo = useMemo(
    () => buildGeometry(metrics, origin, ringStepMs, maxDist),
    [metrics, origin, ringStepMs, maxDist],
  )

  return (
    <>
      {cellIcons.map((icon, i) => {
        if (blocked?.has(i)) return null
        // Guard: during a resize, metrics (and therefore `geo`) can update
        // in the same render where `cellIcons` is still the pre-resize
        // length. Skip cells whose geometry slot hasn't been materialized
        // yet — React will reconcile on the next commit.
        const g = geo[i]
        if (!g) return null
        return <Cell key={i} icon={icon} geometry={g} onCopy={onCopy} onFocusIcon={onFocusIcon} />
      })}
    </>
  )
}
