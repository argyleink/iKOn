'use client'

import type { Icon } from '@/lib/types'
import { memo, useRef } from 'react'
import styles from './Cell.module.css'

export type CellGeometry = {
  d: string
  stroke: string
  alpha: string
}

type CellProps = {
  icon: Icon | null
  geometry: CellGeometry
  onCopy: (icon: Icon, el: HTMLButtonElement) => void
  onFocusIcon: (icon: Icon, el: HTMLButtonElement) => void
}

function CellImpl({ icon, geometry, onCopy, onFocusIcon }: CellProps) {
  const clickTimer = useRef<number | null>(null)

  return (
    <button
      type="button"
      className={`relative w-[var(--cell)] h-[var(--cell)] p-1.5 bg-transparent border-0 cursor-pointer text-fg select-none [contain:style] outline-0 outline-dashed outline-transparent transition-[outline-offset,outline-color] ${styles.cell}`}
      style={
        {
          '--d': geometry.d,
          '--stroke': geometry.stroke,
          '--alpha': geometry.alpha,
        } as React.CSSProperties
      }
      data-empty={icon ? undefined : true}
      aria-label={icon ? `${icon.name.replace(/-/g, ' ')} · ${icon.pack}` : 'empty cell'}
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
      {icon ? (
        <span key={icon.id} className={styles.layer} aria-hidden="true">
          <svg className={styles.svg} data-pack={icon.pack}>
            <use href={`#${icon.id}`} />
          </svg>
        </span>
      ) : null}
    </button>
  )
}

export const Cell = memo(CellImpl)
