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
}

const IDLE_MS = 5000

export function SearchInput({ value, onChange, onClear, focusedIcon = null }: Props) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const showTips = idle && value.trim() === ''
  const { tip, idx: tipIdx } = useCyclingTip(showTips)
  const hasValue = value.length > 0

  const handleClear = () => {
    onChange('')
    resetIdle()
    inputRef.current?.focus()
  }

  return (
    <search className={styles.wrap}>
      <label className="relative pointer-events-auto flex items-center justify-center gap-3.5 px-2 w-full">
        <span id={labelId} className="sr-only">
          Search icons
        </span>
        {focusedIcon ? (
          <button
            type="button"
            onClick={onClear}
            aria-label={`Selected: ${focusedIcon.name.replace(/-/g, ' ')}. Click to clear.`}
            title="selected · click to clear"
            className={`flex-none self-center grid place-items-center w-[22px] h-[22px] p-0 bg-transparent border border-[var(--outline,var(--fg))] text-[var(--outline,var(--fg))] cursor-pointer pointer-events-auto transition-colors duration-150 hover:bg-[var(--outline,var(--fg))] hover:text-bg focus-visible:outline-2 focus-visible:outline-dashed focus-visible:[outline-color:var(--outline)] focus-visible:outline-offset-[3px] ${styles.chip}`}
          >
            <span
              key={focusedIcon.id}
              className={`grid place-items-center w-4 h-4 text-current [&>svg]:w-full [&>svg]:h-full [&>svg]:stroke-current [&>svg]:fill-none [&>svg]:[stroke-width:2] [&>svg[data-pack=phosphor]]:stroke-none [&>svg[data-pack=phosphor]]:fill-current ${styles.chipIcon}`}
              aria-hidden="true"
              dangerouslySetInnerHTML={{ __html: focusedIcon.svg }}
            />
          </button>
        ) : null}

        {/* Input + tip overlay live in the same flex slot. Tip overlay is
            absolutely positioned inside this relative wrap so the input
            keeps its full width and center alignment. */}
        <span className="relative flex-1 min-w-0 flex items-center justify-center">
          <input
            ref={inputRef}
            className={`w-full min-w-0 bg-transparent border-0 outline-none text-fg text-[18px] font-thin tracking-[0.04em] uppercase text-center p-0 appearance-none [-webkit-tap-highlight-color:transparent] ${styles.input}`}
            type="search"
            inputMode="search"
            enterKeyHint="search"
            value={value}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
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
          {showTips ? (
            <span
              key={tipIdx}
              aria-hidden="true"
              className="absolute inset-0 flex items-center justify-center pointer-events-none text-dim text-[14px] lowercase tracking-[0.04em] [animation:tip-reveal_520ms_var(--ease-out-3)]"
            >
              {tip}
            </span>
          ) : null}
        </span>

        {hasValue ? (
          <button
            type="button"
            onClick={handleClear}
            aria-label="clear search"
            title="clear"
            className="flex-none self-center grid place-items-center w-[22px] h-[22px] rounded-full border border-fg/0 bg-transparent text-fg opacity-25 cursor-pointer pointer-events-auto transition-opacity duration-150 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-dashed focus-visible:[outline-color:var(--outline)] focus-visible:outline-offset-[3px]"
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
