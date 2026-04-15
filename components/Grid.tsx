'use client'

import { centerOf, measureGrid, radialDelay } from '@/lib/grid'
import { loadIcons } from '@/lib/loadIcons'
import { type SearchDB, buildDB, neighborsOf, search } from '@/lib/search'
import type { Icon } from '@/lib/types'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Cell } from './Cell'
import styles from './Grid.module.css'
import { SearchInput } from './SearchInput'
import { type ToastItem, ToastLayer } from './Toast'

const CELL_PX = 48
const RESIZE_DEBOUNCE_MS = 300
const RING_STEP_MS = 28

type Origin = { col: number; row: number; index: number } | null

export function Grid() {
  const stageRef = useRef<HTMLDivElement | null>(null)
  const [db, setDb] = useState<SearchDB | null>(null)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Icon | null>(null)
  const [metrics, setMetrics] = useState({ cols: 0, rows: 0, total: 0, cellPx: CELL_PX })
  const [origin, setOrigin] = useState<Origin>(null)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextToastId = useRef(1)
  const arcFlip = useRef(false)

  useEffect(() => {
    let alive = true
    loadIcons().then((icons) => {
      if (!alive) return
      setDb(buildDB(icons))
    })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!stageRef.current) return
    const el = stageRef.current
    let timer: number | null = null
    let first = true

    const apply = () => {
      const rect = el.getBoundingClientRect()
      const m = measureGrid(rect.width, rect.height, CELL_PX)
      setMetrics(m)
      if (!first) {
        const c = centerOf(m)
        setOrigin({ col: c.col, row: c.row, index: -1 })
      }
      first = false
    }

    apply()
    const ro = new ResizeObserver(() => {
      if (timer) window.clearTimeout(timer)
      timer = window.setTimeout(apply, RESIZE_DEBOUNCE_MS)
    })
    ro.observe(el)
    return () => {
      ro.disconnect()
      if (timer) window.clearTimeout(timer)
    }
  }, [])

  const results = useMemo<Icon[]>(() => {
    if (!db) return []
    if (query.trim()) return search(db, query, metrics.total)
    if (selected) return neighborsOf(db, selected, metrics.total)
    return db.icons.slice(0, metrics.total)
  }, [db, query, selected, metrics.total])

  const cells = useMemo<Array<Icon | null>>(() => {
    const out: Array<Icon | null> = new Array(metrics.total).fill(null)
    for (let i = 0; i < results.length && i < metrics.total; i++) out[i] = results[i]
    return out
  }, [results, metrics.total])

  const originRef = useMemo(() => {
    if (origin) return origin
    if (metrics.total === 0) return null
    const c = centerOf(metrics)
    return { col: c.col, row: c.row, index: -1 }
  }, [origin, metrics])

  const handleQueryChange = useCallback(
    (v: string) => {
      setQuery(v)
      setSelected(null)
      if (metrics.total === 0) return
      const c = centerOf(metrics)
      setOrigin({ col: c.col, row: c.row, index: -1 })
    },
    [metrics],
  )

  const handleClear = useCallback(() => {
    setQuery('')
    setSelected(null)
  }, [])

  const handleCellClick = useCallback(
    (icon: Icon, el: HTMLButtonElement) => {
      navigator.clipboard?.writeText(icon.svg).then(
        () => pushToast(el, 'copied'),
        () => pushToast(el, 'copy failed'),
      )

      if (query.trim()) return
      const idx = cells.indexOf(icon)
      if (idx === -1) return
      setSelected(icon)
      setOrigin({
        col: idx % metrics.cols,
        row: Math.floor(idx / metrics.cols),
        index: idx,
      })
    },
    [cells, metrics.cols, query],
  )

  const pushToast = (el: HTMLButtonElement, message: string) => {
    const rect = el.getBoundingClientRect()
    const arc: 'left' | 'right' = arcFlip.current ? 'left' : 'right'
    arcFlip.current = !arcFlip.current
    const id = nextToastId.current++
    setToasts((prev) => [
      ...prev,
      { id, message, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, arc },
    ])
  }

  const removeToast = useCallback(
    (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id)),
    [],
  )

  const gridStyle = {
    ['--cols' as string]: metrics.cols,
    ['--cell' as string]: `${metrics.cellPx}px`,
  } as React.CSSProperties

  const originIndex = selected && originRef && originRef.index >= 0 ? originRef.index : null

  return (
    <div ref={stageRef} className={styles.stage}>
      {!db ? <div className={styles.loader}>loading icons…</div> : null}
      <div className={styles.grid} style={gridStyle}>
        {cells.map((icon, i) => {
          const delay = originRef ? radialDelay(i, metrics.cols, originRef, RING_STEP_MS) : 0
          return (
            <Cell
              key={i}
              index={i}
              icon={icon}
              delayMs={delay}
              originIndex={originIndex}
              onClick={handleCellClick}
            />
          )
        })}
      </div>
      <SearchInput
        value={query}
        onChange={handleQueryChange}
        onClear={handleClear}
        count={results.length}
        total={db?.icons.length ?? 0}
      />
      <div className={styles.hint}>
        {selected && !query
          ? `browsing neighbors of ${selected.name} · esc to reset`
          : 'click an icon to copy svg · click to browse neighbors'}
      </div>
      <ToastLayer toasts={toasts} onDone={removeToast} />
    </div>
  )
}
