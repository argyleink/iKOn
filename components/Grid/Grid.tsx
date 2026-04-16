'use client'

import type { Icon } from '@/lib/icons'
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { Toaster, toast } from 'sonner'
import { Config, type ConfigValues, DEFAULT_CONFIG, INITIAL_VARS, applyConfig } from '../Config'
import { SearchInput } from '../SearchInput'
import { GridCells } from './GridCells'
import { Loader } from './Loader'
import { type Mode, useCellAssembly } from './hooks/useCellAssembly'
import { useGlobalKeys } from './hooks/useGlobalKeys'
import { useGridMetrics } from './hooks/useGridMetrics'
import { useIconDB } from './hooks/useIconDB'
import { useMediaQuery } from './hooks/useMediaQuery'
import { useSelectionColor } from './hooks/useSelectionColor'
import { useShake } from './hooks/useShake'
import { useSwapCycle } from './hooks/useSwapCycle'

/** Deep-link each icon pack to its open-source browser page. Phosphor and
 *  iconoir don't have per-name detail URLs so we pre-fill their search. */
function iconSourceUrl(icon: Icon): string {
  const name = encodeURIComponent(icon.name)
  switch (icon.pack) {
    case 'lucide':
      return `https://lucide.dev/icons/${name}`
    case 'phosphor':
      return `https://phosphoricons.com/?q=${name}`
    case 'iconoir':
      return `https://iconoir.com/?s=${name}`
  }
}

export function Grid() {
  const mainRef = useRef<HTMLElement | null>(null)
  const db = useIconDB()

  const [config, setConfig] = useState<ConfigValues>(DEFAULT_CONFIG)
  const [configOpen, setConfigOpen] = useState(false)

  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [focusIcon, setFocusIcon] = useState<Icon | null>(null)
  const [focusIdx, setFocusIdx] = useState<number | null>(null)

  // Rotates per page load and whenever browse mode re-enters from a non-empty
  // search. Safe across SSR: no icons render until db resolves on the client.
  const [browseSeed, setBrowseSeed] = useState(() => Math.random().toString(36).slice(2))
  const prevQueryEmpty = useRef(true)
  useEffect(() => {
    const isEmpty = query.trim() === ''
    if (!prevQueryEmpty.current && isEmpty) {
      setBrowseSeed(Math.random().toString(36).slice(2))
    }
    prevQueryEmpty.current = isEmpty
  }, [query])

  const metrics = useGridMetrics(mainRef, config.cellPx)
  const isNarrow = useMediaQuery('(max-width: 639.98px)')

  // Custom props live on the <main> element, not :root.
  useEffect(() => {
    if (mainRef.current) applyConfig(config, mainRef.current)
  }, [config])

  // Rotate the text-selection P3 color on each new non-empty selection.
  // The hook writes onto mainRef, so anything under <main> that reads
  // `var(--selection)` (::selection, the search chip's border+fill) stays
  // in lockstep via plain CSS inheritance — no prop drilling needed.
  useSelectionColor(mainRef)

  const mode = useMemo<Mode>(() => {
    const q = deferredQuery.trim()
    if (q) return { kind: 'search', query: deferredQuery }
    if (focusIcon) return { kind: 'browse', focus: focusIcon, originIndex: focusIdx }
    return { kind: 'browse', focus: null, originIndex: null, seed: browseSeed }
  }, [deferredQuery, focusIcon, focusIdx, browseSeed])

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

  const gridRef = useRef<HTMLDivElement | null>(null)

  // Layers are invisible (opacity:0 forced) when either the hide-until-hover
  // config mode is on with an empty query, or a search yielded zero hits.
  // Passed into useSwapCycle so transitioning AWAY from a hidden state can
  // skip the exit phase — there's nothing visible to animate out.
  const iconsHidden =
    (config.hideUntilHover && query.trim() === '') || (mode.kind === 'search' && resultCount === 0)

  // Pro-level state machine for the swap cycle — see useSwapCycle.ts for
  // the full reducer logic. Eliminates the old rAF/data-entered race by
  // relying on CSS @starting-style to auto-animate fresh layer mounts.
  const { phase: swapPhase, displayedIcons } = useSwapCycle(mode, cellIcons, gridRef, iconsHidden)
  const exiting = swapPhase === 'exiting'

  const cellIconsRef = useRef(displayedIcons)
  cellIconsRef.current = displayedIcons

  const resetContext = useCallback(() => {
    setQuery('')
    setFocusIcon(null)
    setFocusIdx(null)
  }, [])

  const toggleConfig = useCallback(() => setConfigOpen((v) => !v), [])
  useGlobalKeys({
    onToggleConfig: toggleConfig,
    onEscape: resetContext,
  })

  // Mobile: shake the device to open the secret controls. On iOS Safari
  // this prompts for motion permission on first tap.
  const openConfig = useCallback(() => setConfigOpen(true), [])
  useShake(openConfig)

  const handleQueryChange = useCallback((v: string) => {
    setQuery(v)
    // Always clear focus on user-typed input — typing is exploration, a
    // prior focus context from a double-click should not linger.
    setFocusIcon(null)
    setFocusIdx(null)
  }, [])

  const handleCopy = useCallback((icon: Icon, _el: HTMLButtonElement) => {
    const preview = (
      // The span fills its sonner-provided [data-icon] slot (sized in
      // globals.css). Inner SVG is forced to 100% so glyphs scale with
      // the slot rather than their intrinsic viewBox size.
      <span
        className="grid place-items-center w-full h-full text-fg [&>svg]:w-full [&>svg]:h-full [&>svg]:stroke-current [&>svg]:fill-none [&>svg[data-pack=phosphor]]:stroke-none [&>svg[data-pack=phosphor]]:fill-current"
        dangerouslySetInnerHTML={{ __html: icon.svg }}
      />
    )
    const meta = [icon.pack, ...icon.tags.slice(0, 3)].filter(Boolean).join(' · ')
    const sourceUrl = iconSourceUrl(icon)

    const onSuccess = () =>
      toast(icon.name.replace(/-/g, ' '), {
        icon: preview,
        description: meta,
        action: {
          label: 'source',
          onClick: () => window.open(sourceUrl, '_blank', 'noopener,noreferrer'),
        },
      })
    const onFailure = () => toast.error('copy failed', { icon: preview, description: icon.name })

    // Prefer the richer async ClipboardItem API — it auto-prompts for
    // permission on capable browsers and publishes both plain text (raw
    // SVG source) and image/svg+xml so paste targets that understand
    // image data get the picture, not just the markup.
    const cb = navigator.clipboard
    if (cb && typeof window.ClipboardItem === 'function' && typeof cb.write === 'function') {
      const payload = new window.ClipboardItem({
        'text/plain': new Blob([icon.svg], { type: 'text/plain' }),
        'image/svg+xml': new Blob([icon.svg], { type: 'image/svg+xml' }),
      })
      cb.write([payload]).then(onSuccess, () => {
        // Fall back to writeText if the browser rejected the richer item.
        if (cb.writeText) cb.writeText(icon.svg).then(onSuccess, onFailure)
        else onFailure()
      })
      return
    }
    if (cb?.writeText) {
      cb.writeText(icon.svg).then(onSuccess, onFailure)
      return
    }
    toast.error('clipboard unavailable', { icon: preview, description: icon.name })
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
        className="grid [grid-template-columns:repeat(var(--cols),var(--cell))] [grid-template-rows:repeat(var(--rows),var(--cell))] justify-center content-center [column-gap:var(--gap)] [row-gap:var(--gap)] w-full h-full"
        style={gridStyle}
        data-phase={exiting ? 'exiting' : 'idle'}
        // Hide cells behind hover-reveal either when the user opts into
        // that mode via config (and isn't searching), OR whenever a search
        // yields zero matches — the grid is filled with filler icons so it
        // still looks alive, but they're only revealed when the user hovers.
        data-hide-until-hover={iconsHidden ? true : undefined}
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
          noResults={mode.kind === 'search' && resultCount === 0}
        />
      </div>

      <Toaster
        // Desktop: pin toasts at the top so they don't cover grid rows the
        // user is reading. Mobile: bottom-center — thumb reach + no overlap
        // with the centered search input. 640px matches Tailwind's `sm`.
        position={isNarrow ? 'bottom-center' : 'top-center'}
        closeButton
        theme="dark"
        toastOptions={{
          unstyled: false,
          classNames: {
            toast:
              'flex items-center gap-3 bg-bg border border-faint text-fg px-3 py-2 rounded-none text-[11px] uppercase tracking-[0.06em] shadow-none',
            description: 'text-dim text-[10px] normal-case tracking-[0.04em]',
            actionButton:
              'superellipse bg-transparent border border-faint text-fg px-2 py-1 text-[10px] uppercase tracking-[0.06em] cursor-pointer transition-colors hover:[border-color:var(--fg)]',
            closeButton:
              'superellipse bg-transparent border border-faint text-dim hover:text-fg hover:[border-color:var(--fg)]',
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
