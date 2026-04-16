'use client'

import { useEffect, useState } from 'react'
import { loadIcons } from '../loadIcons'
import { type SearchDB, buildDB } from '../search'

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
