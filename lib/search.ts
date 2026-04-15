import type { Icon } from './types'

export type SearchDB = {
  icons: Icon[]
  byId: Map<string, Icon>
  byToken: Map<string, Set<number>>
}

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

/** Score an icon against tokenized query. */
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

export function search(db: SearchDB, query: string, limit: number): Icon[] {
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

  const scored: Array<{ icon: Icon; score: number }> = []
  for (const i of candidates) {
    const icon = db.icons[i]
    const s = scoreIcon(icon, qTokens, q)
    if (s > 0) scored.push({ icon, score: s })
  }
  scored.sort((a, b) => b.score - a.score || a.icon.id.localeCompare(b.icon.id))
  return scored.slice(0, limit).map((s) => s.icon)
}

export function neighborsOf(db: SearchDB, icon: Icon, limit: number): Icon[] {
  const out: Icon[] = [icon]
  for (const id of icon.neighbors) {
    const n = db.byId.get(id)
    if (n) out.push(n)
    if (out.length >= limit) break
  }
  return out
}
