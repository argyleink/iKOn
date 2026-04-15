'use client'

import type { Icon } from '@/lib/types'
import { memo, useEffect, useRef, useState } from 'react'
import styles from './Cell.module.css'

type Props = {
  icon: Icon | null
  delayMs: number
  index: number
  originIndex: number | null
  onClick: (icon: Icon, el: HTMLButtonElement) => void
}

/** Keep previous icon around so we can crossfade/scale it out while the new one pops in. */
function useSwap(icon: Icon | null) {
  const [current, setCurrent] = useState<Icon | null>(icon)
  const [prev, setPrev] = useState<Icon | null>(null)
  const prevIdRef = useRef<string | null>(icon?.id ?? null)

  useEffect(() => {
    const nextId = icon?.id ?? null
    if (nextId === prevIdRef.current) return
    setPrev(current)
    setCurrent(icon)
    prevIdRef.current = nextId
    const t = window.setTimeout(() => setPrev(null), 900)
    return () => window.clearTimeout(t)
  }, [icon, current])

  return { current, prev }
}

function CellImpl({ icon, delayMs, index, originIndex, onClick }: Props) {
  const { current, prev } = useSwap(icon)
  const inRef = useRef<HTMLSpanElement | null>(null)
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    setEntered(false)
    if (!current) return
    const id = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(id)
  }, [current?.id])

  const isOrigin = originIndex === index
  return (
    <button
      type="button"
      className={styles.cell}
      style={{ ['--d' as string]: `${delayMs}ms` }}
      data-origin={isOrigin || undefined}
      data-empty={current ? undefined : true}
      aria-label={current?.name ?? 'empty'}
      onClick={(e) => current && onClick(current, e.currentTarget)}
    >
      {prev ? (
        <span
          key={`prev-${prev.id}`}
          className={styles.layer}
          dangerouslySetInnerHTML={{ __html: prev.svg }}
        />
      ) : null}
      {current ? (
        <span
          key={`cur-${current.id}`}
          ref={inRef}
          className={styles.layer}
          data-state={entered ? 'in' : undefined}
          dangerouslySetInnerHTML={{ __html: current.svg }}
        />
      ) : null}
    </button>
  )
}

export const Cell = memo(CellImpl)
