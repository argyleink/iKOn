'use client'

import type { ToastItem } from '@/components/Toast'
import { useCallback, useRef, useState } from 'react'

/** Tiny toast queue with alternating left/right arc direction. */
export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(1)
  const arcFlip = useRef(false)

  const push = useCallback((el: HTMLElement, message: string) => {
    const rect = el.getBoundingClientRect()
    const arc: 'left' | 'right' = arcFlip.current ? 'left' : 'right'
    arcFlip.current = !arcFlip.current
    const id = nextId.current++
    setToasts((prev) => [
      ...prev,
      {
        id,
        message,
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        arc,
      },
    ])
  }, [])

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return { toasts, push, remove }
}
