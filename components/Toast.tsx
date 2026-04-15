'use client'

import { useEffect, useState } from 'react'
import styles from './Toast.module.css'

export type ToastItem = {
  id: number
  message: string
  x: number
  y: number
  arc: 'left' | 'right'
}

type Props = { toasts: ToastItem[]; onDone: (id: number) => void }

export function ToastLayer({ toasts, onDone }: Props) {
  return (
    <div className={styles.layer} aria-live="polite">
      {toasts.map((t) => (
        <ToastView key={t.id} toast={t} onDone={() => onDone(t.id)} />
      ))}
    </div>
  )
}

function ToastView({ toast, onDone }: { toast: ToastItem; onDone: () => void }) {
  const [state, setState] = useState<'enter' | 'travel' | 'out'>('enter')

  useEffect(() => {
    const r1 = requestAnimationFrame(() => setState('travel'))
    const t1 = window.setTimeout(() => setState('out'), 900)
    const t2 = window.setTimeout(onDone, 1400)
    return () => {
      cancelAnimationFrame(r1)
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [onDone])

  const arcSign = toast.arc === 'left' ? -1 : 1
  return (
    <div
      className={styles.toast}
      data-state={state}
      style={{
        left: `${toast.x}px`,
        top: `${toast.y}px`,
        ['--arc-x' as string]: `${arcSign * 36}px`,
        ['--arc-y' as string]: '-44px',
      }}
    >
      {toast.message}
    </div>
  )
}
