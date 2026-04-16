export type GridMetrics = {
  cols: number
  rows: number
  total: number
  cellPx: number
}

export type Origin = { col: number; row: number }

export function measureGrid(containerW: number, containerH: number, cellPx: number): GridMetrics {
  const cols = Math.max(1, Math.floor(containerW / cellPx))
  const rows = Math.max(1, Math.floor(containerH / cellPx))
  return { cols, rows, total: cols * rows, cellPx }
}

export function centerOf(metrics: GridMetrics): Origin {
  return { col: (metrics.cols - 1) / 2, row: (metrics.rows - 1) / 2 }
}

export function indexToColRow(index: number, cols: number) {
  return { col: index % cols, row: Math.floor(index / cols) }
}

export function radialDistance(index: number, cols: number, origin: Origin): number {
  const { col, row } = indexToColRow(index, cols)
  const dc = col - origin.col
  const dr = row - origin.row
  return Math.sqrt(dc * dc + dr * dr)
}

/** Returns cell indices sorted by ascending radial distance from origin. */
export function rankedCellOrder(metrics: GridMetrics, origin: Origin): number[] {
  const order = Array.from({ length: metrics.total }, (_, i) => i)
  order.sort(
    (a, b) =>
      radialDistance(a, metrics.cols, origin) - radialDistance(b, metrics.cols, origin) || a - b,
  )
  return order
}

/** Unit vector from origin to a cell, used for directional exit. */
export function directionFrom(index: number, cols: number, origin: Origin) {
  const { col, row } = indexToColRow(index, cols)
  const dc = col - origin.col
  const dr = row - origin.row
  const mag = Math.sqrt(dc * dc + dr * dr) || 1
  return { x: dc / mag, y: dr / mag }
}

export function radialDelay(index: number, cols: number, origin: Origin, stepMs: number): number {
  return Math.round(radialDistance(index, cols, origin) * stepMs)
}
