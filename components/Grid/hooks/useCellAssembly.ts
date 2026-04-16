'use client'

import type { Icon } from '@/lib/icons'
import { useMemo } from 'react'
// Search lives with SearchInput (the feature it drives); the grid is a
// consumer of its results, not its owner.
import { type SearchDB, fillTo, neighborsOf, searchScored } from '../../SearchInput/search'
import { type GridMetrics, type Origin, centerOf, radialDistance } from '../metrics'

export type Mode =
  | { kind: 'browse'; focus: Icon | null; originIndex: number | null; seed?: string }
  | { kind: 'search'; query: string }

export type Reservation = {
  row: number
  colStart: number
  span: number
  blocked: Set<number>
}

/** Clamp ~20–40ch to an integer column span, given the current cell size. */
export function computeInputSpan(cols: number, cellPx: number): number {
  const min = Math.ceil(160 / cellPx)
  const max = Math.ceil(320 / cellPx)
  const preferred = Math.max(min, Math.min(max, Math.round(cols * 0.4)))
  return Math.max(min, Math.min(preferred, cols - 2))
}

function buildReservation(metrics: GridMetrics): Reservation | null {
  if (metrics.total === 0) return null
  const span = computeInputSpan(metrics.cols, metrics.cellPx)
  const row = Math.floor((metrics.rows - 1) / 2)
  const colStart = Math.floor((metrics.cols - span) / 2)
  const blocked = new Set<number>()
  for (let c = colStart; c < colStart + span; c++) {
    blocked.add(row * metrics.cols + c)
  }
  return { row, colStart, span, blocked }
}

/**
 * Derives everything we render from db + metrics + mode:
 *   - reservation (blocked cells for the search input)
 *   - origin (shockwave origin; center or focused cell)
 *   - rankedAvailable (non-blocked cell indices, sorted radially)
 *   - cellIcons (final N-length array with icons placed by rank)
 *   - maxDist (normalization for weight)
 *   - resultCount
 */
export function useCellAssembly(db: SearchDB | null, metrics: GridMetrics, mode: Mode) {
  const reservation = useMemo(() => buildReservation(metrics), [metrics])

  // Placement origin is always grid-center — the enter wave always emanates
  // from the middle. The double-click-to-focus transient temporarily lets
  // the EXIT wave emanate from the clicked cell, but that's driven from
  // Grid.tsx and applied at the GridCells geometry layer, not here.
  const origin = useMemo<Origin>(() => {
    if (metrics.total === 0) return { col: 0, row: 0 }
    return centerOf(metrics)
  }, [metrics])

  const rankedAvailable = useMemo(() => {
    if (metrics.total === 0) return [] as number[]
    const blocked = reservation?.blocked
    const order: number[] = []
    for (let i = 0; i < metrics.total; i++) {
      if (!blocked?.has(i)) order.push(i)
    }
    order.sort(
      (a, b) =>
        radialDistance(a, metrics.cols, origin) - radialDistance(b, metrics.cols, origin) || a - b,
    )
    return order
  }, [metrics, origin, reservation])

  const { cellIcons, resultCount } = useMemo(() => {
    if (!db || metrics.total === 0 || rankedAvailable.length === 0) {
      return { cellIcons: [] as (Icon | null)[], resultCount: 0 }
    }

    let primary: Icon[] = []
    let seed = 'default'

    if (mode.kind === 'search') {
      const scored = searchScored(db, mode.query, rankedAvailable.length)
      primary = scored.map((s) => s.icon)
      seed = `q:${mode.query}`
    } else if (mode.focus) {
      primary = neighborsOf(db, mode.focus, rankedAvailable.length)
      seed = `f:${mode.focus.id}`
    } else if (mode.seed) {
      primary = []
      seed = `browse:${mode.seed}`
    } else {
      primary = db.icons.slice(0, rankedAvailable.length)
      seed = 'browse:default'
    }

    const filled = fillTo(db, primary, rankedAvailable.length, seed)
    const cells: (Icon | null)[] = new Array(metrics.total).fill(null)
    for (let rank = 0; rank < filled.length; rank++) {
      cells[rankedAvailable[rank]] = filled[rank]
    }
    return { cellIcons: cells, resultCount: primary.length }
  }, [db, metrics.total, mode, rankedAvailable])

  const maxDist = useMemo(() => {
    if (metrics.total === 0) return 1
    const corners = [0, metrics.cols - 1, metrics.total - 1, metrics.total - metrics.cols]
    return Math.max(...corners.map((i) => radialDistance(i, metrics.cols, origin)), 1)
  }, [metrics, origin])

  return { reservation, origin, rankedAvailable, cellIcons, resultCount, maxDist }
}
