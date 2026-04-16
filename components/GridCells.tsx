'use client'

import type { GridMetrics, Origin } from '@/lib/grid'
import type { Icon } from '@/lib/types'
import { useMemo } from 'react'
import { Cell, type CellGeometry } from './Cell'

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
      alpha: (0.4 + weight * 0.6).toFixed(3),
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
        return (
          <Cell
            key={i}
            icon={icon}
            geometry={geo[i]}
            onCopy={onCopy}
            onFocusIcon={onFocusIcon}
          />
        )
      })}
    </>
  )
}
