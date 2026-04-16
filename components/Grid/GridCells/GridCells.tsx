'use client'

/**
 * GridCells is the projection layer between the Grid's data model
 * (metrics + icons + shockwave origin) and the per-cell DOM. It answers
 * one question for every cell: "given your position and the wave origin,
 * what do you look like?" Those answers are packed into a small
 * `CellGeometry` record and piped to each Cell via CSS custom properties.
 *
 * CSS integration at a glance — each geometry field maps directly to a
 * custom prop that Cell sets inline, and Cell.module.css consumes:
 *
 *   geometry.d      → `--d`      → `transition-delay` (shockwave stagger)
 *   geometry.stroke → `--stroke` → `stroke-width` of the inner SVG
 *   geometry.alpha  → `--alpha`  → resting `opacity` of `.layer`
 *   geometry.tab    → tabIndex   → keyboard traversal order (not CSS, but
 *                                  derived from the same distance metric)
 *
 * The grid itself is laid out by `grid-template-columns/rows:
 * repeat(var(--cols), var(--cell))` on the parent wrapper — we don't
 * position cells, we just render `metrics.total` of them in DOM order and
 * let CSS Grid put each one in its slot.
 */

import type { Icon } from '@/lib/icons'
import { useMemo } from 'react'
import { Cell, type CellGeometry } from '../Cell'
import type { GridMetrics, Origin } from '../metrics'

type Props = {
  cellIcons: (Icon | null)[]
  metrics: GridMetrics
  origin: Origin
  /** Farthest radial distance on the grid; used to normalize `weight` so
   *  stroke/alpha fade to their edge values at the corner cells. */
  maxDist: number
  /** ms per unit of radial distance — drives the shockwave tempo. User
   *  tunable via the "ring step" slider in the secret controls. */
  ringStepMs: number
  /** Cells reserved for the search input's grid area. These render as
   *  `null` so the input doesn't sit on top of a cell. */
  blocked: Set<number> | undefined
  onCopy: (icon: Icon, el: HTMLButtonElement) => void
  onFocusIcon: (icon: Icon, el: HTMLButtonElement) => void
}

/**
 * Compute every cell's geometry in one pass. Runs inline (no radialDistance
 * call per cell) because it's the hot path on resize — a ~300-cell grid
 * re-runs this once per size change. Kept as a plain function, memoized at
 * the hook level, so the output array is stable as long as the inputs are.
 *
 * Weight is a 0..1 falloff — 1 at the origin, 0 at the farthest corner —
 * that's mapped into visible ranges:
 *   stroke : 1.1 (corner) → 2.4 (center)
 *   alpha  : 0.15 (corner) → 1.0 (center)
 * This is what gives the grid its "spotlight" feel: center icons are
 * heavier and more opaque, edge icons recede.
 */
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
    const row = (i / cols) | 0 // |0 is a hot-path cast-to-int
    const dc = col - origin.col
    const dr = row - origin.row
    const dist = Math.sqrt(dc * dc + dr * dr)
    const weight = Math.max(0, Math.min(1, 1 - dist / maxDist))
    geo[i] = {
      // ms string so it can be plugged straight into `transition-delay`.
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
  // Recompute only when a geometry input actually changes. cellIcons is
  // NOT a dep — icon identity changes don't move the shockwave math.
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
