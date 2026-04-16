import type { Icon } from '@/lib/icons'
import { describe, expect, it } from 'vitest'
import { buildDB, neighborsOf, search } from './search'

const mk = (id: string, name: string, tokens: string[], neighbors: string[] = []): Icon => ({
  id,
  pack: 'lucide',
  name,
  tags: [],
  categories: [],
  svg: '',
  tokens,
  neighbors,
})

describe('search', () => {
  const icons: Icon[] = [
    mk(
      'lucide:arrow-right',
      'arrow-right',
      ['arrow', 'right', 'east'],
      ['lucide:arrow-left', 'lucide:chevron-right'],
    ),
    mk('lucide:arrow-left', 'arrow-left', ['arrow', 'left', 'west']),
    mk('lucide:chevron-right', 'chevron-right', ['chevron', 'right']),
    mk('lucide:house', 'house', ['house', 'home']),
  ]
  const db = buildDB(icons)

  it('finds exact matches first', () => {
    const r = search(db, 'arrow-right', 10)
    expect(r[0].id).toBe('lucide:arrow-right')
  })

  it('finds prefix matches across tokens', () => {
    const r = search(db, 'arr', 10).map((i) => i.id)
    expect(r).toContain('lucide:arrow-right')
    expect(r).toContain('lucide:arrow-left')
  })

  it('returns empty on empty query', () => {
    expect(search(db, '', 10)).toEqual([])
  })

  it('neighborsOf places source first then hydrates neighbor ids', () => {
    const r = neighborsOf(db, icons[0], 10)
    expect(r[0].id).toBe('lucide:arrow-right')
    expect(r.slice(1).map((i) => i.id)).toEqual(['lucide:arrow-left', 'lucide:chevron-right'])
  })
})
