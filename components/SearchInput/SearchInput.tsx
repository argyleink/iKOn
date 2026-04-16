'use client'

import type { Icon } from '@/lib/icons'
import { useId } from 'react'
import styles from './SearchInput.module.css'

type Props = {
  value: string
  onChange: (v: string) => void
  onClear: () => void
  focusedIcon?: Icon | null
}

export function SearchInput({ value, onChange, onClear, focusedIcon = null }: Props) {
  const labelId = useId()

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
        <input
          className={`flex-1 min-w-0 bg-transparent border-0 outline-none text-fg text-[18px] font-thin tracking-[0.04em] uppercase text-center w-full p-0 appearance-none [-webkit-tap-highlight-color:transparent] ${styles.input}`}
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
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClear()
          }}
        />
      </label>
    </search>
  )
}
