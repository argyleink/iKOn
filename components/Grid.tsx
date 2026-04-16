'use client'

import { type Mode, useCellAssembly } from '@/lib/hooks/useCellAssembly'
import { useGlobalKeys } from '@/lib/hooks/useGlobalKeys'
import { useGridMetrics } from '@/lib/hooks/useGridMetrics'
import { useIconDB } from '@/lib/hooks/useIconDB'
import { useToasts } from '@/lib/hooks/useToasts'
import type { Icon } from '@/lib/types'
import { useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Config, type ConfigValues, DEFAULT_CONFIG, applyConfig } from './Config'
import styles from './Grid.module.css'
import { GridCells } from './GridCells'
import { IconSprite } from './IconSprite'
import { SearchInput } from './SearchInput'
import { ToastLayer } from './Toast'

export function Grid() {
  const stageRef = useRef<HTMLDivElement | null>(null)
  const db = useIconDB()

  const [config, setConfig] = useState<ConfigValues>(DEFAULT_CONFIG)
  const [configOpen, setConfigOpen] = useState(false)

  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [focusIcon, setFocusIcon] = useState<Icon | null>(null)
  const [focusIdx, setFocusIdx] = useState<number | null>(null)

  const metrics = useGridMetrics(stageRef, config.cellPx, config.resizeDebounceMs)
  const { toasts, push: pushToast, remove: removeToast } = useToasts()

  useEffect(() => applyConfig(config), [config])

  const mode = useMemo<Mode>(() => {
    const q = deferredQuery.trim()
    if (q) return { kind: 'search', query: deferredQuery }
    if (focusIcon) return { kind: 'browse', focus: focusIcon, originIndex: focusIdx }
    return { kind: 'browse', focus: null, originIndex: null }
  }, [deferredQuery, focusIcon, focusIdx])

  /* -------- Exit-then-enter sequencing ---------------------------------
   *
   * Cells stay mounted at their index positions — they never remount. When
   * `mode` changes, `exiting` toggles `data-phase="exiting"` on the grid
   * → CSS plays a uniform scale-out on every cell's current layer. After
   * `swapOutMs`, `committedMode` is updated → `useCellAssembly` recomputes
   * → each cell receives a new icon prop → the inner layer span (keyed by
   * icon id) remounts → enter shockwave plays.
   *
   * Because the SearchInput is a plain sibling in the same grid (never
   * remounted, never keyed), it stays focused and interactive throughout.
   * All cell prop updates land in a single React commit = one synchronous
   * DOM write batch — no layout thrashing.
   * ------------------------------------------------------------------ */
  const [committedMode, setCommittedMode] = useState(mode)
  const [exiting, setExiting] = useState(false)

  const modeRef = useRef(mode)
  modeRef.current = mode
  const exitTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (mode === committedMode) return

    setExiting(true)
    exitTimerRef.current = window.setTimeout(() => {
      exitTimerRef.current = null
      setCommittedMode(modeRef.current)
      setExiting(false)
    }, config.swapOutMs)

    return () => {
      if (exitTimerRef.current !== null) {
        window.clearTimeout(exitTimerRef.current)
        exitTimerRef.current = null
      }
    }
  }, [mode, committedMode, config.swapOutMs])

  const { reservation, origin, cellIcons, maxDist } = useCellAssembly(
    db,
    metrics,
    committedMode,
  )

  /* -------- SVG sprite — lazy, pre-paint registration ------------------ */
  const [spriteIcons, setSpriteIcons] = useState<Icon[]>([])

  useLayoutEffect(() => {
    setSpriteIcons((prev) => {
      const known = new Set(prev.map((i) => i.id))
      const additions: Icon[] = []
      for (const ic of cellIcons) {
        if (ic && !known.has(ic.id)) {
          known.add(ic.id)
          additions.push(ic)
        }
      }
      return additions.length > 0 ? [...prev, ...additions] : prev
    })
  }, [cellIcons])

  const cellIconsRef = useRef(cellIcons)
  cellIconsRef.current = cellIcons

  const resetContext = useCallback(() => {
    setQuery('')
    setFocusIcon(null)
    setFocusIdx(null)
  }, [])

  useGlobalKeys({
    onToggleConfig: useCallback(() => setConfigOpen((v) => !v), []),
    onEscape: resetContext,
  })

  const handleQueryChange = useCallback((v: string) => {
    setQuery(v)
    if (v.trim()) {
      setFocusIcon(null)
      setFocusIdx(null)
    }
  }, [])

  const handleCopy = useCallback(
    (icon: Icon, el: HTMLButtonElement) => {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(icon.svg).then(
          () => pushToast(el, 'copied'),
          () => pushToast(el, 'copy failed'),
        )
      } else {
        pushToast(el, 'clipboard unavailable')
      }
    },
    [pushToast],
  )

  const handleFocusIcon = useCallback((icon: Icon, _el?: HTMLButtonElement) => {
    const idx = cellIconsRef.current.indexOf(icon)
    setQuery(icon.name.replace(/-/g, ' '))
    setFocusIcon(icon)
    setFocusIdx(idx >= 0 ? idx : null)
  }, [])

  const gridStyle = {
    ['--cols' as string]: metrics.cols,
    ['--cell' as string]: `${metrics.cellPx}px`,
    ['--input-col-start' as string]: reservation ? reservation.colStart + 1 : 1,
    ['--input-col-span' as string]: reservation ? reservation.span : 1,
    ['--input-row' as string]: reservation ? reservation.row + 1 : 1,
  } as React.CSSProperties

  return (
    <div ref={stageRef} className="fixed inset-0 overflow-hidden bg-bg [contain:strict]">
      {!db ? (
        <div className="fixed inset-0 grid place-items-center text-dim text-[11px]">
          loading icons…
        </div>
      ) : null}

      <IconSprite icons={spriteIcons} />

      <div
        className={`${styles.grid} w-full h-full`}
        style={gridStyle}
        data-phase={exiting ? 'exiting' : 'idle'}
      >
        <GridCells
          cellIcons={cellIcons}
          metrics={metrics}
          origin={origin}
          maxDist={maxDist}
          ringStepMs={config.ringStepMs}
          blocked={reservation?.blocked}
          onCopy={handleCopy}
          onFocusIcon={handleFocusIcon}
        />

        <SearchInput
          value={query}
          onChange={handleQueryChange}
          onClear={resetContext}
          focusedIcon={focusIcon}
        />
      </div>

      <ToastLayer toasts={toasts} onDone={removeToast} />
      <Config
        open={configOpen}
        values={config}
        onChange={setConfig}
        onClose={() => setConfigOpen(false)}
      />
    </div>
  )
}
