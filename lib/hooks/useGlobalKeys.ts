'use client'

import { useEffect } from 'react'

type Handlers = {
  onToggleConfig: () => void
  onEscape: () => void
}

/** Global keyboard shortcuts: $ toggles config, Esc clears focus+query. */
export function useGlobalKeys({ onToggleConfig, onEscape }: Handlers) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '$') {
        e.preventDefault()
        onToggleConfig()
        return
      }
      if (e.key === 'Escape') onEscape()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onToggleConfig, onEscape])
}
