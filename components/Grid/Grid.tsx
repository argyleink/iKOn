'use client'

import type { Icon } from '@/lib/icons'
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { Toaster, toast } from 'sonner'
import { Config, type ConfigValues, DEFAULT_CONFIG, INITIAL_VARS, applyConfig } from '../Config'
import { SearchInput } from '../SearchInput'
import styles from './Grid.module.css'
import { GridCells } from './GridCells'
import { Loader } from './Loader'
import { type Mode, useCellAssembly } from './hooks/useCellAssembly'
import { useGlobalKeys } from './hooks/useGlobalKeys'
import { useGridMetrics } from './hooks/useGridMetrics'
import { useIconDB } from './hooks/useIconDB'

export function Grid() {
  const mainRef = useRef<HTMLElement | null>(null)
  const db = useIconDB()

  const [config, setConfig] = useState<ConfigValues>(DEFAULT_CONFIG)
  const [configOpen, setConfigOpen] = useState(false)

  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [focusIcon, setFocusIcon] = useState<Icon | null>(null)
  const [focusIdx, setFocusIdx] = useState<number | null>(null)

  const metrics = useGridMetrics(mainRef, config.cellPx)

  // Custom props live on the <main> element, not :root.
  useEffect(() => {
    if (mainRef.current) applyConfig(config, mainRef.current)
  }, [config])

  // Rainbow: cycle selection + outline colors via refs (no querySelector).
  useEffect(() => {
    const el = mainRef.current
    if (!el) return
    const SEL = [
      'color(display-p3 1 0.25 0.55)',
      'color(display-p3 1 0.65 0.1)',
      'color(display-p3 1 0.95 0.35)',
      'color(display-p3 0.45 1 0.5)',
      'color(display-p3 0.15 0.95 0.95)',
      'color(display-p3 0.35 0.6 1)',
      'color(display-p3 0.8 0.35 1)',
      'color(display-p3 1 0.45 0.85)',
    ]
    const OUT = [
      'color(display-p3 1 0.1 0.45)',
      'color(display-p3 1 0.5 0.05)',
      'color(display-p3 1 0.9 0.15)',
      'color(display-p3 0.3 1 0.4)',
      'color(display-p3 0.05 0.95 0.9)',
      'color(display-p3 0.25 0.5 1)',
      'color(display-p3 0.75 0.2 1)',
      'color(display-p3 1 0.2 0.8)',
    ]
    let si = Math.floor(Math.random() * SEL.length)
    let oi = Math.floor(Math.random() * OUT.length)
    let lastRange = ''
    let lastFocus: EventTarget | null = null

    const onSelection = () => {
      const sel = window.getSelection()
      if (!sel) return
      const key = `${sel.anchorOffset}:${sel.focusOffset}:${sel.toString().length}`
      if (key === lastRange) return
      lastRange = key
      if (sel.toString().length === 0) return
      si = (si + 1) % SEL.length
      el.style.setProperty('--selection', SEL[si])
    }
    const onFocus = (e: FocusEvent) => {
      if (e.target === lastFocus) return
      lastFocus = e.target
      oi = (oi + 1) % OUT.length
      el.style.setProperty('--outline', OUT[oi])
    }
    document.addEventListener('selectionchange', onSelection)
    document.addEventListener('focusin', onFocus)
    return () => {
      document.removeEventListener('selectionchange', onSelection)
      document.removeEventListener('focusin', onFocus)
    }
  }, [])

  const mode = useMemo<Mode>(() => {
    const q = deferredQuery.trim()
    if (q) return { kind: 'search', query: deferredQuery }
    if (focusIcon) return { kind: 'browse', focus: focusIcon, originIndex: focusIdx }
    return { kind: 'browse', focus: null, originIndex: null }
  }, [deferredQuery, focusIcon, focusIdx])

  /* -------- Always compute with the LIVE mode ----------------------------
   *
   * useCellAssembly sees the current mode immediately — results are ready
   * the instant the user types. During the exit phase we display OLD icons
   * (via displayedIcons) while the new set waits. When exit completes,
   * displayedIcons flips to the already-computed new icons in the same
   * commit = zero dead time between exit and enter. */
  const { reservation, origin, cellIcons, resultCount, maxDist } = useCellAssembly(
    db,
    metrics,
    mode,
  )

  const [displayedIcons, setDisplayedIcons] = useState<(Icon | null)[]>([])
  const [exiting, setExiting] = useState(false)
  // `entered` flips true one frame after new icons are committed. That one-
  // frame gap lets the browser see the "from" state (scale 0) before the
  // "to" state (scale 1) is applied, which is what makes the CSS transition
  // fire. Without it the browser would batch from+to into the same style
  // calculation and skip the transition entirely.
  const [entered, setEntered] = useState(false)

  const prevModeRef = useRef<Mode | null>(null)
  const latestIconsRef = useRef(cellIcons)
  latestIconsRef.current = cellIcons
  const enterRafRef = useRef(0)
  const gridRef = useRef<HTMLDivElement | null>(null)

  // Mode-change controller: kicks off exit, commits entry on first
  // render with data, or silently syncs on layout-only changes.
  useEffect(() => {
    const prev = prevModeRef.current

    if (prev === null) {
      if (cellIcons.length === 0) return
      prevModeRef.current = mode
      setDisplayedIcons(cellIcons)
      setEntered(false)
      // Double rAF: the first frame lets the browser paint the new layers at
      // their `from` state (scale 0). The second frame flips data-entered so
      // the `to` state paints a transition. Without both frames, some
      // browsers collapse the two style changes into one recalc and skip the
      // transition — which is the shockwave regression the user hit.
      enterRafRef.current = requestAnimationFrame(() => {
        enterRafRef.current = requestAnimationFrame(() => setEntered(true))
      })
      return
    }

    if (prev === mode) {
      if (cellIcons !== displayedIcons) setDisplayedIcons(cellIcons)
      return
    }

    prevModeRef.current = mode
    setExiting(true)
    setEntered(false)
  }, [mode, cellIcons, displayedIcons])

  // Exit completion via `transitionend` — no setTimeout. During
  // `data-phase="exiting"`, all .layer elements transition `transform`
  // uniformly; the first `transform` transitionend bubbled up means the
  // exit has finished.
  //
  // IMPORTANT: cleanup only removes the transitionend listener. It does
  // NOT cancel `enterRafRef` — that rAF is scheduled inside the handler
  // AFTER setExiting(false), and the cleanup runs in the SAME commit as
  // that state change. Cancelling it here would prevent `setEntered(true)`
  // from ever running on subsequent cycles → cells stuck at scale(0).
  useEffect(() => {
    if (!exiting) return
    const el = gridRef.current
    if (!el) return

    const onEnd = (e: TransitionEvent) => {
      if (e.propertyName !== 'transform') return
      setDisplayedIcons(latestIconsRef.current)
      setExiting(false)
      // Double rAF: the first frame lets the browser paint the new layers at
      // their `from` state (scale 0). The second frame flips data-entered so
      // the `to` state paints a transition. Without both frames, some
      // browsers collapse the two style changes into one recalc and skip the
      // transition — which is the shockwave regression the user hit.
      enterRafRef.current = requestAnimationFrame(() => {
        enterRafRef.current = requestAnimationFrame(() => setEntered(true))
      })
    }
    el.addEventListener('transitionend', onEnd, { once: true })
    return () => el.removeEventListener('transitionend', onEnd)
  }, [exiting])

  const cellIconsRef = useRef(displayedIcons)
  cellIconsRef.current = displayedIcons

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
    // Always clear focus on user-typed input — typing is exploration, a
    // prior focus context from a double-click should not linger.
    setFocusIcon(null)
    setFocusIdx(null)
  }, [])

  const handleCopy = useCallback((icon: Icon, _el: HTMLButtonElement) => {
    const preview = (
      <span
        className="inline-grid place-items-center w-6 h-6 text-fg [&>svg]:w-full [&>svg]:h-full [&>svg]:stroke-current [&>svg]:fill-none [&>svg[data-pack=phosphor]]:stroke-none [&>svg[data-pack=phosphor]]:fill-current"
        dangerouslySetInnerHTML={{ __html: icon.svg }}
      />
    )
    const meta = [icon.pack, ...icon.tags.slice(0, 3)].filter(Boolean).join(' · ')

    if (!navigator.clipboard?.writeText) {
      toast.error('clipboard unavailable', { icon: preview, description: icon.name })
      return
    }
    navigator.clipboard.writeText(icon.svg).then(
      () =>
        toast(icon.name.replace(/-/g, ' '), {
          icon: preview,
          description: meta,
        }),
      () => toast.error('copy failed', { icon: preview, description: icon.name }),
    )
  }, [])

  const handleFocusIcon = useCallback((icon: Icon, _el?: HTMLButtonElement) => {
    const idx = cellIconsRef.current.indexOf(icon)
    setQuery(icon.name.replace(/-/g, ' '))
    setFocusIcon(icon)
    setFocusIdx(idx >= 0 ? idx : null)
  }, [])

  // Guard against 0 — `repeat(0, ...)` is invalid CSS and breaks the grid.
  const cols = Math.max(1, metrics.cols)
  const rows = Math.max(1, metrics.rows)
  const gridStyle = {
    ['--cols' as string]: cols,
    ['--rows' as string]: rows,
    ['--cell' as string]: `${metrics.cellPx}px`,
    ['--input-col-start' as string]: reservation ? reservation.colStart + 1 : 1,
    ['--input-col-span' as string]: reservation ? reservation.span : 1,
    ['--input-row' as string]: reservation ? reservation.row + 1 : 1,
  } as React.CSSProperties

  return (
    <main
      ref={mainRef}
      className="h-dvh overflow-hidden bg-bg text-fg"
      style={INITIAL_VARS as React.CSSProperties}
    >
      {!db ? <Loader /> : null}

      <div
        ref={gridRef}
        className={`${styles.grid} w-full h-full`}
        style={gridStyle}
        data-phase={exiting ? 'exiting' : 'idle'}
        data-entered={entered || undefined}
        data-hide-until-hover={
          // Hide cells behind hover-reveal either when the user opts into
          // that mode via config (and isn't searching), OR whenever a
          // search yields zero matches — the grid is filled with filler
          // icons so it still looks alive, but they're only revealed when
          // the user hovers.
          (config.hideUntilHover && query.trim() === '') ||
          (mode.kind === 'search' && resultCount === 0)
            ? true
            : undefined
        }
      >
        <GridCells
          cellIcons={displayedIcons}
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

      <Toaster
        position="bottom-center"
        closeButton
        theme="dark"
        toastOptions={{
          unstyled: false,
          classNames: {
            toast:
              'flex items-center gap-3 bg-bg border border-faint text-fg px-3 py-2 rounded-none text-[11px] uppercase tracking-[0.06em] shadow-none',
            description: 'text-dim text-[10px] normal-case tracking-[0.04em]',
            closeButton:
              'bg-transparent border border-faint text-dim hover:text-fg hover:[border-color:var(--outline)] focus-visible:outline-2 focus-visible:outline-dashed focus-visible:[outline-color:var(--outline)]',
          },
        }}
      />
      <Config
        open={configOpen}
        values={config}
        onChange={setConfig}
        onClose={() => setConfigOpen(false)}
      />
    </main>
  )
}
