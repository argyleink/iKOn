'use client'

import { useCountUp } from '@/lib/useCountUp'
import { useId } from 'react'
import styles from './SearchInput.module.css'

type Props = {
  value: string
  onChange: (v: string) => void
  onClear: () => void
  count: number
  total: number
  packs?: string[]
}

const DEFAULT_PACKS = ['Lucide', 'Phosphor', 'Iconoir']

export function SearchInput({
  value,
  onChange,
  onClear,
  count,
  total,
  packs = DEFAULT_PACKS,
}: Props) {
  const labelId = useId()
  const hasQuery = value.trim().length > 0
  const animated = useCountUp(hasQuery ? count : total)

  return (
    <search className={styles.wrap}>
      <label className={styles.field}>
        <span id={labelId} className={styles.srOnly}>
          Search to reveal icons — results ripple across the grid, closest matches near the center.
        </span>
        <span className={styles.prompt} aria-hidden="true">
          i<span className={styles.kaps}>KO</span>n
        </span>
        <input
          className={styles.input}
          type="search"
          value={value}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          // biome-ignore lint/a11y/noAutofocus: primary interaction of the app.
          autoFocus
          aria-labelledby={labelId}
          aria-describedby={`${labelId}-count`}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClear()
          }}
        />
        <span className={styles.countWrap}>
          <span
            id={`${labelId}-count`}
            className={styles.count}
            // biome-ignore lint/a11y/noNoninteractiveTabindex: reveals tooltip on keyboard focus.
            tabIndex={0}
            aria-label={
              hasQuery
                ? `${count.toLocaleString()} of ${total.toLocaleString()} matches`
                : `${total.toLocaleString()} icons loaded`
            }
          >
            {animated.toLocaleString()}
          </span>
          <span className={styles.tooltip} role="tooltip">
            <span className={styles.tHead}>
              {hasQuery
                ? `${count.toLocaleString()} of ${total.toLocaleString()} icons`
                : `${total.toLocaleString()} icons loaded`}
            </span>
            <span className={styles.tBody}>
              Ranked live by blended similarity:
              <span className={styles.tRow}>
                <em>name tokens</em>
                <em className={styles.tWeight}>60%</em>
              </span>
              <span className={styles.tRow}>
                <em>tag overlap</em>
                <em className={styles.tWeight}>25%</em>
              </span>
              <span className={styles.tRow}>
                <em>category overlap</em>
                <em className={styles.tWeight}>15%</em>
              </span>
              <span className={styles.tRow}>
                <em>cross-pack bonus</em>
                <em className={styles.tWeight}>+5%</em>
              </span>
            </span>
            <span className={styles.tFoot}>{packs.join(' · ')}</span>
          </span>
        </span>
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
