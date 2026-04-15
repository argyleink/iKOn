export type GridMetrics = {
  cols: number
  rows: number
  total: number
  cellPx: number
}

export function measureGrid(containerW: number, containerH: number, cellPx: number): GridMetrics {
  const cols = Math.max(1, Math.floor(containerW / cellPx))
  const rows = Math.max(1, Math.floor(containerH / cellPx))
  return { cols, rows, total: cols * rows, cellPx }
}

/**
 * Radial delay: cells nearer the origin animate first, cells at the far edge last.
 * Returns milliseconds.
 */
export function radialDelay(
  index: number,
  cols: number,
  origin: { col: number; row: number },
  stepMs: number,
): number {
  const col = index % cols
  const row = Math.floor(index / cols)
  const dc = col - origin.col
  const dr = row - origin.row
  const d = Math.sqrt(dc * dc + dr * dr)
  return Math.round(d * stepMs)
}

export function centerOf(metrics: GridMetrics) {
  return { col: (metrics.cols - 1) / 2, row: (metrics.rows - 1) / 2 }
}
