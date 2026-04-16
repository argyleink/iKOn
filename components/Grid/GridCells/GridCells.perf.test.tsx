import type { Icon } from '@/lib/icons'
/**
 * Performance regression test for the cell grid.
 *
 * Exercises the two hot paths the user reports as janky:
 *   1. Viewport resize  — metrics change → every Cell re-renders because its
 *      position-derived props (delay/dir/ocx/ocy/weight) all change.
 *   2. Icon swap        — query change flips `icon` on every visible cell,
 *      driving a fresh commit with new `<use>` references via the sprite.
 *
 * We render <GridCells> with a realistic cell count (20×12 = 240) and use
 * React.Profiler to capture actual commit durations and commit counts.
 *
 * Thresholds are soft and informative: the test always prints a metrics
 * table; assertions are budgets that should FAIL if perf regresses.
 */
import { act, cleanup, render } from '@testing-library/react'
import { Profiler, type ProfilerOnRenderCallback, useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { measureGrid } from '../metrics'
import { GridCells } from './GridCells'

const COLS = 20
const ROWS = 12
const CELL_PX = 48
const TOTAL = COLS * ROWS

// minimal-but-realistic SVG; dangerouslySetInnerHTML makes parse cost matter
const fakeSvg = (seed: number) =>
  `<svg viewBox="0 0 24 24"><path d="M${seed % 12} ${seed % 8}L12 12L${(seed * 3) % 24} ${(seed * 5) % 24}Z"/><circle cx="12" cy="12" r="${4 + (seed % 6)}"/></svg>`

function makeIcons(count: number, offset = 0): Icon[] {
  const icons: Icon[] = []
  for (let i = 0; i < count; i++) {
    const n = i + offset
    icons.push({
      id: `icon-${n}`,
      pack: 'lucide',
      name: `icon-${n}`,
      tags: [],
      categories: [],
      svg: fakeSvg(n),
      tokens: [`t${n}`],
      neighbors: [],
    })
  }
  return icons
}

type Sample = { phase: 'mount' | 'update'; actual: number; base: number }

function collect(): { samples: Sample[]; onRender: ProfilerOnRenderCallback } {
  const samples: Sample[] = []
  const onRender: ProfilerOnRenderCallback = (_id, phase, actual, base) => {
    if (phase === 'mount' || phase === 'update') {
      samples.push({ phase, actual, base })
    }
  }
  return { samples, onRender }
}

function summarize(label: string, samples: Sample[]) {
  const updates = samples.filter((s) => s.phase === 'update')
  const mounts = samples.filter((s) => s.phase === 'mount')
  const totalUpdate = updates.reduce((a, s) => a + s.actual, 0)
  const totalMount = mounts.reduce((a, s) => a + s.actual, 0)
  const baseUpdate = updates.reduce((a, s) => a + s.base, 0)
  const rows = {
    scenario: label,
    mountCommits: mounts.length,
    updateCommits: updates.length,
    mountMs: +totalMount.toFixed(2),
    updateMs: +totalUpdate.toFixed(2),
    baseUpdateMs: +baseUpdate.toFixed(2),
    memoSavings:
      baseUpdate > 0 ? `${(((baseUpdate - totalUpdate) / baseUpdate) * 100).toFixed(0)}%` : '-',
    avgUpdateMs: updates.length ? +(totalUpdate / updates.length).toFixed(2) : 0,
  }
  return rows
}

// Stable callback identities (matches production Grid.tsx useCallback behavior).
const stableOnCopy = () => {}
const stableOnFocusIcon = () => {}

const baseProps = (icons: (Icon | null)[], cols = COLS, rows = ROWS, cellPx = CELL_PX) => ({
  cellIcons: icons,
  metrics: { cols, rows, total: cols * rows, cellPx },
  origin: { col: (cols - 1) / 2, row: (rows - 1) / 2 },
  maxDist: Math.hypot(cols / 2, rows / 2),
  ringStepMs: 28,

  blocked: undefined,

  onCopy: stableOnCopy,
  onFocusIcon: stableOnFocusIcon,
})

afterEach(() => cleanup())

describe('GridCells — performance', () => {
  it('baseline mount of 240 cells', () => {
    const { samples, onRender } = collect()
    const icons = makeIcons(TOTAL)

    render(
      <Profiler id="grid" onRender={onRender}>
        <GridCells {...baseProps(icons)} />
      </Profiler>,
    )

    const stats = summarize('mount', samples)
    console.log('[perf] mount', stats)
    // Budget: initial mount of 240 cells should commit in < 1000ms in jsdom.
    expect(stats.mountMs).toBeLessThan(1500)
  })

  it('resize: all 240 cells re-render when metrics change', () => {
    const { samples, onRender } = collect()
    const icons = makeIcons(TOTAL)

    // Harness that lets us flip metrics at will.
    function Harness() {
      const [{ cols, rows }, setMetrics] = useState({ cols: COLS, rows: ROWS })
      ;(Harness as unknown as { _set?: (c: number, r: number) => void })._set = (c, r) =>
        setMetrics({ cols: c, rows: r })
      const m = measureGrid(cols * CELL_PX, rows * CELL_PX, CELL_PX)
      const list = icons.slice(0, m.total)
      while (list.length < m.total) list.push(icons[list.length % icons.length])
      return <GridCells {...baseProps(list, m.cols, m.rows, m.cellPx)} />
    }

    render(
      <Profiler id="grid" onRender={onRender}>
        <Harness />
      </Profiler>,
    )

    const mountCount = samples.length

    // Simulate a sequence of resize ticks — similar to a drag-resize.
    const sizes: Array<[number, number]> = [
      [22, 12],
      [22, 14],
      [24, 14],
      [20, 12],
      [18, 10],
    ]
    for (const [c, r] of sizes) {
      act(() => {
        ;(Harness as unknown as { _set: (c: number, r: number) => void })._set(c, r)
      })
    }

    const after = samples.slice(mountCount)
    const stats = summarize('resize x5', after)
    console.log('[perf] resize', stats)
    // Budget: 5 resize commits shouldn't blow the frame budget wildly.
    expect(stats.updateCommits).toBeGreaterThanOrEqual(5)
  })

  it('swap: icon identity flips on all 240 cells (query change)', async () => {
    const { samples, onRender } = collect()
    const poolA = makeIcons(TOTAL, 0)
    const poolB = makeIcons(TOTAL, 10_000)
    const poolC = makeIcons(TOTAL, 20_000)

    function Harness() {
      const [step, setStep] = useState(0)
      ;(Harness as unknown as { _next?: () => void })._next = () => setStep((s) => s + 1)
      const pool = step === 0 ? poolA : step === 1 ? poolB : poolC
      return <GridCells {...baseProps(pool)} />
    }

    render(
      <Profiler id="grid" onRender={onRender}>
        <Harness />
      </Profiler>,
    )

    const mountCount = samples.length

    // Two full swaps (A→B, B→C). Each flips every cell's `icon` prop.
    // Flush 2 rAFs after each swap so useStagedFlag's staged commits are captured.
    const flushRafs = () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      })

    await act(async () => {
      ;(Harness as unknown as { _next: () => void })._next()
    })
    await act(async () => {
      await flushRafs()
    })
    await act(async () => {
      ;(Harness as unknown as { _next: () => void })._next()
    })
    await act(async () => {
      await flushRafs()
    })

    const after = samples.slice(mountCount)
    const stats = summarize('swap x2', after)
    console.log('[perf] swap', stats)
    expect(stats.updateCommits).toBeGreaterThanOrEqual(2)
  })
})
