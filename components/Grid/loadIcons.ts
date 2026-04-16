'use client'

import type { Icon, IconIndex } from '@/lib/icons'

let cached: Promise<Icon[]> | null = null

export function loadIcons(): Promise<Icon[]> {
  if (cached) return cached
  cached = fetch('/icons.json', { cache: 'force-cache' })
    .then((r) => {
      if (!r.ok) throw new Error(`icons.json ${r.status}`)
      return r.json() as Promise<IconIndex>
    })
    .then((d) => d.icons)
  return cached
}
