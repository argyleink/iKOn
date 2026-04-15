'use client'

import styles from './SearchInput.module.css'

type Props = {
  value: string
  onChange: (v: string) => void
  count: number
  total: number
  onClear: () => void
}

export function SearchInput({ value, onChange, count, total, onClear }: Props) {
  return (
    <div className={styles.wrap}>
      <label className={styles.field}>
        <span className={styles.prompt}>iKOn</span>
        <input
          className={styles.input}
          value={value}
          placeholder="search icons…"
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClear()
          }}
        />
        <span className={styles.meta}>{value ? `${count}/${total}` : total.toLocaleString()}</span>
      </label>
    </div>
  )
}
