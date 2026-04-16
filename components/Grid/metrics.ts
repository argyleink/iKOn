/**
 * Grid geometry — the pure math that translates a rectangular viewport into
 * a column/row lattice and places a "shockwave" origin on it. No React, no
 * DOM, no CSS. Everything here feeds the CSS grid layout (set via custom
 * properties in Grid.tsx) and the per-cell motion (ring step, delay, stroke
 * weight in GridCells.tsx).
 *
 * CSS integration:
 *   - `cols` / `rows` become `--cols` / `--rows`, consumed by the
 *     `grid-template-columns/rows: repeat(var(--cols), var(--cell))` rule
 *     that lives inline on the grid wrapper.
 *   - `cellPx` becomes `--cell` — the track size. Passing it back in
 *     keeps the JS math and the CSS track size definitionally in sync
 *     (a `cellPx` measured for a 48px cell must lay out as 48px).
 *   - `radialDelay` output is written to `--d` per cell, consumed by
 *     `transition-delay: var(--d, 0ms)` on `.layer` — that's what makes
 *     the swap animation emanate outward from `origin`.
 */

export type GridMetrics = {
  /** Number of whole cells that fit across the container. >= 1. */
  cols: number
  /** Number of whole cells that fit down the container. >= 1. */
  rows: number
  /** Precomputed cols * rows — handy because every consumer needs it. */
  total: number
  /** Cell track size in px. Mirrors the CSS `--cell` value. */
  cellPx: number
}

/**
 * Origin of the shockwave, expressed in (col, row) coordinates where both
 * axes can be fractional. A center origin on an even-width grid sits
 * between cells (e.g. col=4.5 on an 10-col grid), which is why all
 * distance math uses floating point.
 */
export type Origin = { col: number; row: number }

/**
 * Derive a whole-cell lattice that fits inside a (containerW × containerH)
 * viewport. Uses floor(), not round(), so a partial trailing cell never
 * gets clipped — the grid always appears to extend to the edge with no
 * half-cells. Minimums of 1 guard against `repeat(0, ...)` which is
 * invalid CSS and blanks the layout.
 */
export function measureGrid(containerW: number, containerH: number, cellPx: number): GridMetrics {
  const cols = Math.max(1, Math.floor(containerW / cellPx))
  const rows = Math.max(1, Math.floor(containerH / cellPx))
  return { cols, rows, total: cols * rows, cellPx }
}

/**
 * Exact geometric center of the grid in (col, row) space. Fractional when
 * either dimension is even — that's the correct behavior: a ring stepping
 * out from col=4.5 on a 10-col grid hits columns 4 and 5 at the same radius.
 */
export function centerOf(metrics: GridMetrics): Origin {
  return { col: (metrics.cols - 1) / 2, row: (metrics.rows - 1) / 2 }
}

/** Flatten a 1D cell index into its (col, row). Inverse of `row*cols + col`. */
export function indexToColRow(index: number, cols: number) {
  return { col: index % cols, row: Math.floor(index / cols) }
}

/**
 * Euclidean distance from `origin` to the cell at `index`, measured in
 * cell units (not px). A cell one step right of origin is distance 1, the
 * diagonal neighbor is ≈1.414, and so on. Distance is what drives the
 * enter/exit ripple — every downstream visual (stagger delay, stroke
 * weight, alpha, tab order) is a function of this number.
 */
export function radialDistance(index: number, cols: number, origin: Origin): number {
  const { col, row } = indexToColRow(index, cols)
  const dc = col - origin.col
  const dr = row - origin.row
  return Math.sqrt(dc * dc + dr * dr)
}

/** Returns cell indices sorted by ascending radial distance from origin.
 *  Ties broken by index for stable ordering across renders. */
export function rankedCellOrder(metrics: GridMetrics, origin: Origin): number[] {
  const order = Array.from({ length: metrics.total }, (_, i) => i)
  order.sort(
    (a, b) =>
      radialDistance(a, metrics.cols, origin) - radialDistance(b, metrics.cols, origin) || a - b,
  )
  return order
}

/** Unit vector from origin to a cell — reserved for directional exits
 *  (e.g. blowing cells outward from a focus point). Not currently used
 *  by the live pipeline but kept because the math is cheap and the
 *  direction is a natural companion to `radialDistance`. */
export function directionFrom(index: number, cols: number, origin: Origin) {
  const { col, row } = indexToColRow(index, cols)
  const dc = col - origin.col
  const dr = row - origin.row
  const mag = Math.sqrt(dc * dc + dr * dr) || 1
  return { x: dc / mag, y: dr / mag }
}

/**
 * Per-cell animation delay in whole ms. This is THE function that produces
 * the shockwave: a cell `k` units from origin lights up `k * stepMs` ms
 * after the center. GridCells.tsx writes the return value into the cell's
 * `--d` custom property; `transition-delay: var(--d, 0ms)` in
 * Cell.module.css does the rest. `stepMs` is user-tunable via the
 * "ring step" slider in the secret controls.
 */
export function radialDelay(index: number, cols: number, origin: Origin, stepMs: number): number {
  return Math.round(radialDistance(index, cols, origin) * stepMs)
}
