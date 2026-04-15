'use client'

import {
  type GridMetrics,
  type Origin,
  directionFrom,
  radialDelay,
  radialDistance,
} from '@/lib/grid'
import type { Icon } from '@/lib/types'
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
  return (
    <>
      {cellIcons.map((icon, i) => {
        if (blocked?.has(i)) return null
        const delay = radialDelay(i, metrics.cols, origin, ringStepMs)
        const dir = directionFrom(i, metrics.cols, origin)
        const dist = radialDistance(i, metrics.cols, origin)
        const weight = Math.max(0, Math.min(1, 1 - dist / maxDist))
        const col = i % metrics.cols
        const row = Math.floor(i / metrics.cols)
        const ocx = originFromCenter ? (metrics.cols / 2 - col - 0.5) * metrics.cellPx : 0
        const ocy = originFromCenter ? (metrics.rows / 2 - row - 0.5) * metrics.cellPx : 0
        return (
          <Cell
            key={i}
            index={i}
            icon={icon}
            delayMs={delay}
            dx={dir.x}
            dy={dir.y}
            ocx={ocx}
            ocy={ocy}
            weight={weight}
            focused={focusedIndex === i}
            onCopy={onCopy}
            onFocusIcon={onFocusIcon}
          />
        )
      })}
    </>
  )
}
