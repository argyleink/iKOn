'use client'

import type { Icon } from '@/lib/icons'
import { useEffect, useId, useRef, useState } from 'react'
import { useCyclingTip } from '../Grid/hooks/useCyclingTip'
import styles from './SearchInput.module.css'

type Props = {
  value: string
  onChange: (v: string) => void
  onClear: () => void
  focusedIcon?: Icon | null
  /** When the current query returned zero matches, flag the clear button
   *  in display-p3 red so the user has an obvious way out. */
  noResults?: boolean
}

const IDLE_MS = 5000

export function SearchInput({
  value,
  onChange,
  onClear,
  focusedIcon = null,
  noResults = false,
}: Props) {
  const labelId = useId()
  const inputRef = useRef<HTMLInputElement | null>(null)

  const [idle, setIdle] = useState(false)
  const idleTimerRef = useRef<number | null>(null)

  const resetIdle = () => {
    setIdle(false)
    if (idleTimerRef.current !== null) window.clearTimeout(idleTimerRef.current)
    idleTimerRef.current = window.setTimeout(() => setIdle(true), IDLE_MS)
  }

  useEffect(() => {
    resetIdle()
    return () => {
      if (idleTimerRef.current !== null) window.clearTimeout(idleTimerRef.current)
    }
  }, [])

  const showTips = idle && value.trim() === ''
  const { tip } = useCyclingTip(showTips)
  const hasValue = value.length > 0

  const handleClear = () => {
    onClear()
    resetIdle()
    inputRef.current?.focus()
  }

  return (
    <search className="[grid-column:var(--input-col-start)/span_var(--input-col-span)] [grid-row:var(--input-row)/span_1] self-stretch justify-self-stretch flex items-center pointer-events-none relative z-[2]">
      <label className="relative pointer-events-auto flex items-center justify-center gap-3.5 px-2 w-full">
        <span id={labelId} className="sr-only">
          Search icons
        </span>
        {focusedIcon ? (
          <button
            type="button"
            // biome-ignore lint/a11y/noPositiveTabindex: cells use positive tabindex for radial order, these nearby buttons need to come first
            tabIndex={2}
            onClick={onClear}
            aria-label={`Selected: ${focusedIcon.name.replace(/-/g, ' ')}. Click to clear.`}
            title="selected · click to clear"
            className={`superellipse flex-none self-center grid place-items-center w-[var(--cell)] h-[var(--cell)] p-1.5 bg-transparent border border-[var(--outline,var(--fg))] text-[var(--outline,var(--fg))] cursor-pointer pointer-events-auto transition-colors duration-150 hover:bg-[var(--outline,var(--fg))] hover:text-bg ${styles.chip}`}
          >
            <span
              key={focusedIcon.id}
              className={`grid place-items-center w-full h-full text-current [&>svg]:w-full [&>svg]:h-full [&>svg]:stroke-current [&>svg]:fill-none [&>svg]:[stroke-width:1.75] [&>svg[data-pack=phosphor]]:stroke-none [&>svg[data-pack=phosphor]]:fill-current ${styles.chipIcon}`}
              aria-hidden="true"
              dangerouslySetInnerHTML={{ __html: focusedIcon.svg }}
            />
          </button>
        ) : null}

        <input
          ref={inputRef}
          // biome-ignore lint/a11y/noPositiveTabindex: cells use positive tabindex for radial order, the input must come first
          tabIndex={1}
          className={`flex-1 min-w-0 bg-transparent border-0 outline-none text-fg text-[18px] font-thin tracking-[0.04em] uppercase text-center p-0 appearance-none [-webkit-tap-highlight-color:transparent] placeholder:text-dim placeholder:opacity-100 placeholder:lowercase placeholder:tracking-[0.04em] ${styles.input}`}
          type="search"
          inputMode="search"
          enterKeyHint="search"
          value={value}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          placeholder={showTips ? tip : ''}
          // biome-ignore lint/a11y/noAutofocus: primary interaction of the app.
          autoFocus
          aria-labelledby={labelId}
          onInput={resetIdle}
          onFocus={resetIdle}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClear()
          }}
        />

        {hasValue ? (
          <button
            type="button"
            // biome-ignore lint/a11y/noPositiveTabindex: cells use positive tabindex for radial order, the clear button needs to come first
            tabIndex={2}
            onClick={handleClear}
            aria-label="clear search"
            title="clear"
            className={`superellipse flex-none self-center grid place-items-center w-[22px] h-[22px] bg-transparent cursor-pointer pointer-events-auto transition-opacity duration-150 hover:opacity-100 focus-visible:opacity-100 ${
              noResults ? 'text-[color(display-p3_1_0_0)] opacity-100' : 'text-fg opacity-25'
            }`}
          >
            <svg
              viewBox="0 0 20 20"
              aria-hidden="true"
              className="w-full h-full stroke-current fill-none"
              strokeWidth={1.5}
            >
              <circle cx="10" cy="10" r="8.5" />
              <path d="M 7 7 L 13 13 M 13 7 L 7 13" strokeLinecap="round" />
            </svg>
          </button>
        ) : null}
      </label>
    </search>
  )
}
