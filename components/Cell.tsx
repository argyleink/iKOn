'use client'

import { useStagedFlag } from '@/lib/hooks/useStagedFlag'
import { useSwap } from '@/lib/hooks/useSwap'
import type { Icon } from '@/lib/types'
import { memo, useRef } from 'react'
import styles from './Cell.module.css'

type CellProps = {
  icon: Icon | null
  index: number
  delayMs: number
  dx: number
  dy: number
  ocx: number
  ocy: number
  weight: number
  focused: boolean
  onCopy: (icon: Icon, el: HTMLButtonElement) => void
  onFocusIcon: (icon: Icon, el: HTMLButtonElement) => void
}

const prettyName = (name: string) => name.replace(/-/g, ' ')

function CellImpl({
  icon,
  index: _index,
  delayMs,
  dx,
  dy,
  ocx,
  ocy,
  weight,
  focused,
  onCopy,
  onFocusIcon,
}: CellProps) {
  const { current, prev } = useSwap(icon)
  const entered = useStagedFlag(Boolean(current))
  const exited = useStagedFlag(Boolean(prev))
  const clickTimer = useRef<number | null>(null)

  const cellStyle = {
    ['--d' as string]: `${delayMs}ms`,
    ['--dx' as string]: dx.toFixed(3),
    ['--dy' as string]: dy.toFixed(3),
    ['--ocx' as string]: `${ocx.toFixed(1)}px`,
    ['--ocy' as string]: `${ocy.toFixed(1)}px`,
    ['--stroke' as string]: (1.1 + weight * 1.3).toFixed(2),
    ['--alpha' as string]: (0.4 + weight * 0.6).toFixed(3),
  } as React.CSSProperties

  return (
    <button
      type="button"
      className={styles.cell}
      style={cellStyle}
      data-focus={focused || undefined}
      data-empty={current ? undefined : true}
      aria-label={current ? `${prettyName(current.name)} icon · ${current.pack}` : 'empty cell'}
      tabIndex={current ? 0 : -1}
      onClick={(e) => {
        if (!current) return
        const el = e.currentTarget
        if (clickTimer.current) {
          window.clearTimeout(clickTimer.current)
          clickTimer.current = null
          onFocusIcon(current, el)
          return
        }
        clickTimer.current = window.setTimeout(() => {
          clickTimer.current = null
          onCopy(current, el)
        }, 220)
      }}
      onKeyDown={(e) => {
        if (!current) return
        // Space → copy; Enter → focus (same as double-click)
        if (e.key === ' ') {
          e.preventDefault()
          onCopy(current, e.currentTarget)
        } else if (e.key === 'Enter') {
          e.preventDefault()
          onFocusIcon(current, e.currentTarget)
        }
      }}
    >
      {prev ? (
        <span
          key={`prev-${prev.id}`}
          className={styles.layer}
          data-role="out"
          data-state={exited ? 'off' : undefined}
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: prev.svg }}
        />
      ) : null}
      {current ? (
        <span
          key={`cur-${current.id}`}
          className={styles.layer}
          data-role="in"
          data-state={entered ? 'on' : undefined}
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: current.svg }}
        />
      ) : null}
    </button>
  )
}

export const Cell = memo(CellImpl)
