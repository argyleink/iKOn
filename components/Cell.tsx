'use client'

import { useSwap } from '@/lib/hooks/useSwap'
import type { Icon } from '@/lib/types'
import { memo, useEffect, useRef } from 'react'
import styles from './Cell.module.css'

type CellProps = {
  icon: Icon | null
  index: number
  focused: boolean
  registerRef: (index: number, el: HTMLButtonElement | null) => void
  onCopy: (icon: Icon, el: HTMLButtonElement) => void
  onFocusIcon: (icon: Icon, el: HTMLButtonElement) => void
}

const prettyName = (name: string) => name.replace(/-/g, ' ')

/**
 * Isolated swap layers.
 *
 * Each layer is keyed by its icon id + role (`in-<id>` / `out-<id>`) so React
 * mounts fresh DOM nodes on every swap. CSS `@starting-style` (Cell.module.css)
 * defines the "from" state — the browser runs the transition the instant the
 * node is inserted, staggered per-cell by `--d` (exit wave) and
 * `--d + --wave-offset` (enter wave).
 *
 * Memoized on `icon` so geometry-only re-renders (resize / origin change) of
 * the parent Cell don't drag useSwap + SVG innerHTML through reconciliation.
 */
const IconLayers = memo(function IconLayers({ icon }: { icon: Icon | null }) {
  const { current, prev } = useSwap(icon)
  return (
    <>
      {prev ? (
        <span
          key={`out-${prev.id}`}
          className={styles.layer}
          data-role="out"
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: prev.svg }}
        />
      ) : null}
      {current ? (
        <span
          key={`in-${current.id}`}
          className={styles.layer}
          data-role="in"
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: current.svg }}
        />
      ) : null}
    </>
  )
})

function CellImpl({ icon, index, focused, registerRef, onCopy, onFocusIcon }: CellProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const clickTimer = useRef<number | null>(null)

  useEffect(() => {
    registerRef(index, buttonRef.current)
    return () => registerRef(index, null)
  }, [index, registerRef])

  return (
    <button
      ref={buttonRef}
      type="button"
      className={styles.cell}
      data-focus={focused || undefined}
      data-empty={icon ? undefined : true}
      aria-label={icon ? `${prettyName(icon.name)} icon · ${icon.pack}` : 'empty cell'}
      tabIndex={icon ? 0 : -1}
      onClick={(e) => {
        if (!icon) return
        const el = e.currentTarget
        if (clickTimer.current) {
          window.clearTimeout(clickTimer.current)
          clickTimer.current = null
          onFocusIcon(icon, el)
          return
        }
        clickTimer.current = window.setTimeout(() => {
          clickTimer.current = null
          onCopy(icon, el)
        }, 220)
      }}
      onKeyDown={(e) => {
        if (!icon) return
        if (e.key === ' ') {
          e.preventDefault()
          onCopy(icon, e.currentTarget)
        } else if (e.key === 'Enter') {
          e.preventDefault()
          onFocusIcon(icon, e.currentTarget)
        }
      }}
    >
      <IconLayers icon={icon} />
    </button>
  )
}

export const Cell = memo(CellImpl)
