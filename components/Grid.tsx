'use client'

import { type Mode, useCellAssembly } from '@/lib/hooks/useCellAssembly'
import { useGlobalKeys } from '@/lib/hooks/useGlobalKeys'
import { useGridMetrics } from '@/lib/hooks/useGridMetrics'
import { useIconDB } from '@/lib/hooks/useIconDB'
import { useToasts } from '@/lib/hooks/useToasts'
import type { Icon } from '@/lib/types'
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { Config, type ConfigValues, DEFAULT_CONFIG, applyConfig } from './Config'
import styles from './Grid.module.css'
import { GridCells } from './GridCells'
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

  /* Write the live config to :root custom properties */
  useEffect(() => applyConfig(config), [config])

  /* Derive search mode from the deferred query, so typing stays responsive */
  const mode = useMemo<Mode>(() => {
    const q = deferredQuery.trim()
    if (q) return { kind: 'search', query: deferredQuery }
    if (focusIcon) return { kind: 'browse', focus: focusIcon, originIndex: focusIdx }
    return { kind: 'browse', focus: null, originIndex: null }
  }, [deferredQuery, focusIcon, focusIdx])

  const { reservation, origin, cellIcons, resultCount, maxDist } = useCellAssembly(
    db,
    metrics,
    mode,
  )

  /* Stable refs so <Cell /> memoization survives unrelated re-renders */
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

  const handleFocusIcon = useCallback((icon: Icon, _el: HTMLButtonElement) => {
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
    <div ref={stageRef} className={styles.stage}>
      {!db ? <div className={styles.loader}>loading icons…</div> : null}

      <div className={styles.grid} style={gridStyle}>
        <GridCells
          cellIcons={cellIcons}
          metrics={metrics}
          origin={origin}
          maxDist={maxDist}
          ringStepMs={config.ringStepMs}
          originFromCenter={config.originFromCenter}
          blocked={reservation?.blocked}
          focusedIndex={focusIdx}
          onCopy={handleCopy}
          onFocusIcon={handleFocusIcon}
        />

        <SearchInput
          value={query}
          onChange={handleQueryChange}
          onClear={resetContext}
          count={resultCount}
          total={db?.icons.length ?? 0}
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
