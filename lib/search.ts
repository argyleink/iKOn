import type { Icon } from './types'

export type SearchDB = {
  icons: Icon[]
  byId: Map<string, Icon>
  byToken: Map<string, Set<number>>
}

export type Scored = { icon: Icon; score: number }

export function buildDB(icons: Icon[]): SearchDB {
  const byId = new Map<string, Icon>()
  const byToken = new Map<string, Set<number>>()
  for (let i = 0; i < icons.length; i++) {
    const icon = icons[i]
    byId.set(icon.id, icon)
    for (const t of icon.tokens) {
      let set = byToken.get(t)
      if (!set) byToken.set(t, (set = new Set()))
      set.add(i)
    }
  }
  return { icons, byId, byToken }
}

function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .split(/[\s\-_/,]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
}

function scoreIcon(icon: Icon, queryTokens: string[], queryRaw: string): number {
  if (queryTokens.length === 0) return 0
  let score = 0
  const hay = icon.name.toLowerCase()
  if (hay === queryRaw) score += 10
  if (hay.startsWith(queryRaw)) score += 3
  if (hay.includes(queryRaw)) score += 1

  for (const qt of queryTokens) {
    if (icon.tokens.includes(qt)) score += 2
    else {
      for (const tok of icon.tokens) {
        if (tok.startsWith(qt) || qt.startsWith(tok)) {
          score += 0.6
          break
        }
      }
    }
    if (icon.tags.some((t) => t.toLowerCase() === qt)) score += 1.5
  }
  return score
}

export function searchScored(db: SearchDB, query: string, limit: number): Scored[] {
  const q = query.trim().toLowerCase()
  if (q === '') return []
  const qTokens = tokenize(q)

  const candidates = new Set<number>()
  for (const qt of qTokens) {
    const exact = db.byToken.get(qt)
    if (exact) for (const i of exact) candidates.add(i)
    for (const [token, set] of db.byToken) {
      if (token.startsWith(qt) || qt.startsWith(token)) {
        for (const i of set) candidates.add(i)
      }
    }
  }
  if (candidates.size === 0) return []

  const scored: Scored[] = []
  for (const i of candidates) {
    const icon = db.icons[i]
    const s = scoreIcon(icon, qTokens, q)
    if (s > 0) scored.push({ icon, score: s })
  }
  scored.sort((a, b) => b.score - a.score || a.icon.id.localeCompare(b.icon.id))
  return scored.slice(0, limit)
}

export function search(db: SearchDB, query: string, limit: number): Icon[] {
  return searchScored(db, query, limit).map((s) => s.icon)
}

export function neighborsOf(db: SearchDB, icon: Icon, limit: number): Icon[] {
  const out: Icon[] = [icon]
  const seen = new Set([icon.id])
  for (const id of icon.neighbors) {
    if (seen.has(id)) continue
    const n = db.byId.get(id)
    if (n) {
      out.push(n)
      seen.add(id)
    }
    if (out.length >= limit) break
  }
  return out
}

/**
 * Deterministic xorshift-ish shuffle seeded from a string, so repeated fills for the
 * same query/context are stable (no visual churn on rerender).
 */
function seededShuffle<T>(arr: T[], seed: string): T[] {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  const out = arr.slice()
  for (let i = out.length - 1; i > 0; i--) {
    h ^= h << 13
    h ^= h >>> 17
    h ^= h << 5
    const j = Math.abs(h) % (i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Produce exactly `total` icons. Primary ranked results come first; remaining slots
 * are filled with expanding neighbors of the top match, then random DB icons, so
 * the grid is never empty.
 */
export function fillTo(db: SearchDB, primary: Icon[], total: number, seedKey: string): Icon[] {
  if (primary.length >= total) return primary.slice(0, total)

  const out = primary.slice()
  const seen = new Set(out.map((i) => i.id))

  if (primary.length > 0) {
    const queue: Icon[] = [...primary]
    let head = 0
    while (out.length < total && head < queue.length) {
      const src = queue[head++]
      for (const nid of src.neighbors) {
        if (seen.has(nid)) continue
        const n = db.byId.get(nid)
        if (!n) continue
        seen.add(nid)
        out.push(n)
        queue.push(n)
        if (out.length >= total) break
      }
    }
  }

  if (out.length < total) {
    const pool = db.icons.filter((i) => !seen.has(i.id))
    const shuffled = seededShuffle(pool, seedKey)
    for (const ic of shuffled) {
      if (out.length >= total) break
      out.push(ic)
      seen.add(ic.id)
    }
  }

  return out.slice(0, total)
}
