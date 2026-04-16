'use client'

import { loadIcons } from '@/lib/icons'
import { useEffect, useState } from 'react'
import { type SearchDB, buildDB } from '../../SearchInput/search'

/** Fetches the icon index once and memoizes a SearchDB.
 *  `loadIcons` lives in lib/icons.ts (global resource).
 *  `buildDB` lives in SearchInput/search.ts (the search engine is owned by
 *  the input component, even though the Grid consumes its results). */
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
