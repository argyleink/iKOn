import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

type Pack = 'lucide' | 'phosphor' | 'iconoir'

type RawIcon = {
  id: string
  pack: Pack
  name: string
  tags: string[]
  categories: string[]
  svg: string
}

type IndexedIcon = RawIcon & {
  tokens: string[]
  neighbors: string[]
}

const STOPWORDS = new Set(['and', 'or', 'the', 'of', 'a', 'an', 'with', 'to', 'in', 'on'])

function tokenize(...inputs: string[]): string[] {
  const out = new Set<string>()
  for (const s of inputs) {
    if (!s) continue
    for (const part of s
      .toLowerCase()
      .replace(/[*_]+/g, ' ')
      .split(/[\s\-_/,&]+/)) {
      const t = part.trim()
      if (t.length > 1 && !STOPWORDS.has(t)) out.add(t)
    }
  }
  return [...out]
}

function cleanSvg(svg: string, pack: Pack): string {
  let s = svg
    .replace(/<\?xml[^?]*\?>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim()
  // Strip width/height only on the root <svg> tag. An earlier global regex
  // also wiped width/height on descendant <rect> elements, which silently
  // broke lucide's rect-based icons (square, rectangle-*, square-square,
  // etc.) — they kept a valid viewBox but rendered at 0×0 because each
  // <rect> needs width/height to have any geometry. Scope the strip to the
  // opening svg tag via a callback replace so the regex only touches that
  // tag's own attribute list.
  s = s.replace(/<svg\b[^>]*>/, (tag) =>
    tag.replace(/\s+width="[^"]*"/g, '').replace(/\s+height="[^"]*"/g, ''),
  )
  s = s.replace(
    /<svg\b/,
    `<svg data-pack="${pack}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet"`,
  )
  return s
}

async function loadLucide(): Promise<RawIcon[]> {
  const iconsDir = 'node_modules/lucide-static/icons'
  const tagsRaw = await readFile('node_modules/lucide-static/tags.json', 'utf8')
  const tagsMap = JSON.parse(tagsRaw) as Record<string, string[]>

  const files = (await readdir(iconsDir)).filter((f) => f.endsWith('.svg'))
  const icons: RawIcon[] = []
  for (const file of files) {
    const name = file.replace(/\.svg$/, '')
    const svg = await readFile(join(iconsDir, file), 'utf8')
    icons.push({
      id: `lucide:${name}`,
      pack: 'lucide',
      name,
      tags: tagsMap[name] ?? [],
      categories: [],
      svg: cleanSvg(svg, 'lucide'),
    })
  }
  return icons
}

type PhosphorMeta = {
  name: string
  categories: string[]
  tags: string[]
}

async function loadPhosphor(): Promise<RawIcon[]> {
  const { icons } = (await import('@phosphor-icons/core')) as unknown as {
    icons: ReadonlyArray<PhosphorMeta>
  }
  const iconsDir = 'node_modules/@phosphor-icons/core/assets/regular'
  const result: RawIcon[] = []
  for (const meta of icons) {
    const file = join(iconsDir, `${meta.name}.svg`)
    let svg: string
    try {
      svg = await readFile(file, 'utf8')
    } catch {
      continue
    }
    result.push({
      id: `phosphor:${meta.name}`,
      pack: 'phosphor',
      name: meta.name,
      tags: meta.tags.filter((t) => !t.startsWith('*')),
      categories: meta.categories,
      svg: cleanSvg(svg, 'phosphor'),
    })
  }
  return result
}

async function loadIconoir(): Promise<RawIcon[]> {
  const iconsDir = 'node_modules/iconoir/icons/regular'
  const files = (await readdir(iconsDir)).filter((f) => f.endsWith('.svg'))
  const icons: RawIcon[] = []
  for (const file of files) {
    const name = file.replace(/\.svg$/, '')
    const svg = await readFile(join(iconsDir, file), 'utf8')
    icons.push({
      id: `iconoir:${name}`,
      pack: 'iconoir',
      name,
      tags: [],
      categories: [],
      svg: cleanSvg(svg, 'iconoir'),
    })
  }
  return icons
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0
  let inter = 0
  for (const v of a) if (b.has(v)) inter++
  const union = a.size + b.size - inter
  return union === 0 ? 0 : inter / union
}

function computeNeighbors(icons: RawIcon[], k = 64): IndexedIcon[] {
  const tokenSets = icons.map((i) => new Set(tokenize(i.name, ...i.tags)))
  const tagSets = icons.map((i) => new Set(i.tags.map((t) => t.toLowerCase())))
  const catSets = icons.map((i) => new Set(i.categories.map((c) => c.toLowerCase())))

  const result: IndexedIcon[] = []
  for (let i = 0; i < icons.length; i++) {
    const scores: Array<{ id: string; score: number }> = []
    for (let j = 0; j < icons.length; j++) {
      if (i === j) continue
      const nameScore = jaccard(tokenSets[i], tokenSets[j])
      if (nameScore === 0 && tagSets[i].size === 0 && catSets[i].size === 0) continue
      const tagScore = jaccard(tagSets[i], tagSets[j])
      const catScore = jaccard(catSets[i], catSets[j])
      const packBonus = icons[i].pack !== icons[j].pack ? 0.05 : 0
      const score = nameScore * 0.6 + tagScore * 0.25 + catScore * 0.15 + packBonus
      if (score > 0) scores.push({ id: icons[j].id, score })
    }
    scores.sort((a, b) => b.score - a.score)
    result.push({
      ...icons[i],
      tokens: [...tokenSets[i]],
      neighbors: scores.slice(0, k).map((s) => s.id),
    })
  }
  return result
}

async function main() {
  const start = Date.now()
  console.log('building icon index…')

  const [lucide, phosphor, iconoir] = await Promise.all([
    loadLucide(),
    loadPhosphor(),
    loadIconoir(),
  ])
  console.log(
    `  lucide: ${lucide.length}  phosphor: ${phosphor.length}  iconoir: ${iconoir.length}`,
  )

  const all = [...lucide, ...phosphor, ...iconoir]
  const indexed = computeNeighbors(all)

  const payload = {
    version: 1,
    generatedAt: new Date().toISOString(),
    count: indexed.length,
    icons: indexed,
  }
  const json = JSON.stringify(payload)
  const hash = createHash('sha256').update(json).digest('hex').slice(0, 8)

  await mkdir('public', { recursive: true })
  await writeFile('public/icons.json', json)

  // Rewrite the two constants at the bottom of lib/icons.ts without
  // disturbing the shared type definitions above.
  const iconsFile = await readFile('lib/icons.ts', 'utf-8')
  const updated = iconsFile
    .replace(/export const ICON_INDEX_HASH = '[^']*'/, `export const ICON_INDEX_HASH = '${hash}'`)
    .replace(/export const ICON_COUNT = \d+/, `export const ICON_COUNT = ${indexed.length}`)
  await writeFile('lib/icons.ts', updated)

  console.log(
    `done in ${((Date.now() - start) / 1000).toFixed(1)}s — ${indexed.length} icons — ${hash}`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
