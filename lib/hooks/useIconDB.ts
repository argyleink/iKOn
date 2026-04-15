'use client'

import { loadIcons } from '@/lib/loadIcons'
import { type SearchDB, buildDB } from '@/lib/search'
import { useEffect, useState } from 'react'

/** Fetches the icon index once and memoizes a SearchDB. */
export function useIconDB(): SearchDB | null {
  const [db, setDb] = useState<SearchDB | null>(null)
  useEffect(() => {
    let alive = true
    loadIcons().then((icons) => {
      if (alive) setDb(buildDB(icons))
    })
    return () => {
      alive = false
    }
  }, [])
  return db
}
