'use client'

import type { Icon } from '@/lib/types'
import { useId } from 'react'
import styles from './SearchInput.module.css'

type Props = {
  value: string
  onChange: (v: string) => void
  onClear: () => void
  focusedIcon?: Icon | null
}

export function SearchInput({
  value,
  onChange,
  onClear,
  focusedIcon = null,
}: Props) {
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
            className={styles.chip}
            onClick={onClear}
            aria-label={`Selected: ${focusedIcon.name.replace(/-/g, ' ')}. Click to clear.`}
            title="selected · click to clear"
          >
            <span
              key={focusedIcon.id}
              className={styles.chipIcon}
              aria-hidden="true"
              dangerouslySetInnerHTML={{ __html: focusedIcon.svg }}
            />
          </button>
        ) : null}
        <input
          className={styles.input}
          type="search"
          value={value}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          placeholder="search icons"
          // biome-ignore lint/a11y/noAutofocus: primary interaction of the app.
          autoFocus
          aria-labelledby={labelId}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClear()
          }}
        />
        <svg
          className={styles.underline}
          viewBox="0 0 100 2"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M 0 1 L 100 1" pathLength={100} />
        </svg>
      </label>
    </search>
  )
}
