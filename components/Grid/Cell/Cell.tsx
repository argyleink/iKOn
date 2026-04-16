'use client'

import type { Icon } from '@/lib/icons'
import { memo, useRef } from 'react'
import styles from './Cell.module.css'

export type CellGeometry = {
  d: string
  stroke: string
  alpha: string
  /** Distance-from-center rank used as tabindex so tab order rotates out
   *  from the center ring by ring. Same distance math as opacity/stroke. */
  tab: number
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
      className={`superellipse group w-[var(--cell)] h-[var(--cell)] p-1.5 flex items-center justify-center bg-transparent border-0 cursor-pointer text-fg select-none [contain:style] [-webkit-tap-highlight-color:transparent] data-[empty]:cursor-default focus-visible:z-4 hover:not-data-[empty]:z-4 ${styles.cell}`}
      style={
        {
          '--d': geometry.d,
          '--stroke': geometry.stroke,
          '--alpha': geometry.alpha,
        } as React.CSSProperties
      }
      data-empty={icon ? undefined : true}
      aria-label={icon ? `${icon.name.replace(/-/g, ' ')} · ${icon.pack}` : 'empty cell'}
      tabIndex={icon ? geometry.tab : -1}
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
        <span
          key={icon.id}
          className={`w-full h-full flex items-center justify-center text-current pointer-events-none ${styles.layer}`}
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: icon.svg }}
        />
      ) : null}
    </button>
  )
}

export const Cell = memo(CellImpl)
