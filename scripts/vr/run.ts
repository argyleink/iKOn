import { existsSync } from 'node:fs'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { type Browser, type BrowserContext, type Page, chromium } from 'playwright'
import type { VRConfig, VRState } from './define'
import { DEFAULT_PROPERTIES } from './properties'

type CliArgs = {
  update: boolean
  only: string | null
  baseUrl: string
  verbose: boolean
}

type CapturedState = {
  selector: string
  properties: Record<string, string>
}

type Golden = {
  name: string
  url: string
  capturedAt: string
  states: Record<string, CapturedState>
}

type StateDiff = {
  property: string
  golden: string
  current: string
}

type FileResult = {
  configPath: string
  goldenPath: string
  name: string
  status: 'baseline' | 'updated' | 'match' | 'diff' | 'error'
  diffs: Record<string, StateDiff[]>
  missingStates: string[]
  extraStates: string[]
  error?: string
}

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const TEST_GLOB_SUFFIX = '.vr.test.ts'
const GOLDEN_SUFFIX = '.vr.golden.json'
const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'dist', 'out', 'build', 'coverage'])

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    update: false,
    only: null,
    baseUrl: process.env.VR_URL ?? 'http://localhost:3000',
    verbose: false,
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--update' || a === '-u') args.update = true
    else if (a === '--verbose' || a === '-v') args.verbose = true
    else if (a === '--only') args.only = argv[++i] ?? null
    else if (a.startsWith('--only=')) args.only = a.slice('--only='.length)
    else if (a === '--url') args.baseUrl = argv[++i] ?? args.baseUrl
    else if (a.startsWith('--url=')) args.baseUrl = a.slice('--url='.length)
    else if (a === '--help' || a === '-h') {
      printHelp()
      process.exit(0)
    }
  }
  return args
}

function printHelp(): void {
  console.log(`vr — computed-css visual regression runner

Usage:
  tsx scripts/vr/run.ts [flags]

Flags:
  -u, --update         Write goldens (approve current state as baseline)
      --only <name>    Only run configs whose name matches this substring
      --url <baseUrl>  Base URL to test against (default: http://localhost:3000)
  -v, --verbose        Log every captured state
  -h, --help           Show this message

Discovery:
  Scans for **/*${TEST_GLOB_SUFFIX} (excluding node_modules, .next, dist).
  Each file must default-export a VRConfig created with defineVR({ ... }).
  Goldens are written next to the test file as <name>${GOLDEN_SUFFIX}.
`)
}

async function walk(dir: string, out: string[] = []): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue
    const p = join(dir, entry.name)
    if (entry.isDirectory()) await walk(p, out)
    else if (entry.isFile() && entry.name.endsWith(TEST_GLOB_SUFFIX)) out.push(p)
  }
  return out
}

async function reachable(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'GET' })
    return res.status < 500
  } catch {
    return false
  }
}

async function loadConfig(path: string): Promise<VRConfig> {
  const mod = await import(pathToFileURL(path).href)
  const cfg = mod.default ?? mod.config
  if (!cfg || typeof cfg !== 'object') {
    throw new Error('no default export (expected defineVR(...))')
  }
  if (typeof cfg.name !== 'string' || typeof cfg.selector !== 'string') {
    throw new Error('missing required fields: name, selector')
  }
  return cfg as VRConfig
}

async function captureState(
  page: Page,
  selector: string,
  properties: readonly string[],
): Promise<Record<string, string>> {
  const result = await page.evaluate(
    ({ sel, props }) => {
      const el = document.querySelector(sel)
      if (!el) return null
      const cs = getComputedStyle(el)
      const out: Record<string, string> = {}
      for (const p of props) out[p] = cs.getPropertyValue(p).trim()
      return out
    },
    { sel: selector, props: [...properties] },
  )
  if (!result) throw new Error(`selector did not match: ${selector}`)
  return result
}

async function runState(
  page: Page,
  rootSelector: string,
  state: VRState,
  properties: readonly string[],
): Promise<CapturedState> {
  const selector = state.selector ?? rootSelector
  const element = page.locator(selector).first()
  await element.waitFor({ state: 'attached', timeout: 5_000 })
  if (state.action) await state.action({ page, element })
  if (state.waitMs) await page.waitForTimeout(state.waitMs)
  const properties_ = await captureState(page, selector, properties)
  return { selector, properties: properties_ }
}

async function runConfig(
  ctx: BrowserContext,
  args: CliArgs,
  configPath: string,
): Promise<FileResult> {
  const goldenPath = configPath.replace(TEST_GLOB_SUFFIX, GOLDEN_SUFFIX)
  const result: FileResult = {
    configPath,
    goldenPath,
    name: '',
    status: 'match',
    diffs: {},
    missingStates: [],
    extraStates: [],
  }

  let config: VRConfig
  try {
    config = await loadConfig(configPath)
  } catch (err) {
    result.status = 'error'
    result.error = err instanceof Error ? err.message : String(err)
    return result
  }
  result.name = config.name
  if (args.only && !config.name.toLowerCase().includes(args.only.toLowerCase())) {
    return { ...result, status: 'match' }
  }

  const properties = config.properties ?? DEFAULT_PROPERTIES
  const states: VRState[] = config.states?.length ? config.states : [{ name: 'default' }]
  const targetUrl = new URL(config.url ?? '/', args.baseUrl).toString()

  const page = await ctx.newPage()
  if (config.viewport) await page.setViewportSize(config.viewport)

  const captured: Record<string, CapturedState> = {}
  try {
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' })
    if (config.waitForSelector) {
      await page
        .locator(config.waitForSelector)
        .first()
        .waitFor({ state: 'attached', timeout: 10_000 })
    } else {
      await page.locator(config.selector).first().waitFor({ state: 'attached', timeout: 10_000 })
    }
    if (config.setup) await config.setup(page)

    for (const state of states) {
      captured[state.name] = await runState(page, config.selector, state, properties)
      if (args.verbose) {
        console.log(`    · captured ${config.name} › ${state.name}`)
      }
    }
  } catch (err) {
    result.status = 'error'
    result.error = err instanceof Error ? err.message : String(err)
    await page.close()
    return result
  } finally {
    await page.close().catch(() => {})
  }

  const current: Golden = {
    name: config.name,
    url: targetUrl,
    capturedAt: new Date().toISOString(),
    states: captured,
  }

  const hasGolden = existsSync(goldenPath)
  if (!hasGolden) {
    await writeFile(goldenPath, `${JSON.stringify(current, null, 2)}\n`)
    result.status = 'baseline'
    return result
  }
  if (args.update) {
    await writeFile(goldenPath, `${JSON.stringify(current, null, 2)}\n`)
    result.status = 'updated'
    return result
  }

  const golden = JSON.parse(await readFile(goldenPath, 'utf8')) as Golden
  const diffs = diffGolden(golden, current)
  result.diffs = diffs.propertyDiffs
  result.missingStates = diffs.missingStates
  result.extraStates = diffs.extraStates
  result.status =
    Object.keys(diffs.propertyDiffs).length === 0 &&
    diffs.missingStates.length === 0 &&
    diffs.extraStates.length === 0
      ? 'match'
      : 'diff'
  return result
}

function diffGolden(
  golden: Golden,
  current: Golden,
): {
  propertyDiffs: Record<string, StateDiff[]>
  missingStates: string[]
  extraStates: string[]
} {
  const propertyDiffs: Record<string, StateDiff[]> = {}
  const goldenStates = new Set(Object.keys(golden.states))
  const currentStates = new Set(Object.keys(current.states))
  const missingStates = [...goldenStates].filter((s) => !currentStates.has(s))
  const extraStates = [...currentStates].filter((s) => !goldenStates.has(s))

  for (const state of currentStates) {
    if (!goldenStates.has(state)) continue
    const g = golden.states[state].properties
    const c = current.states[state].properties
    const keys = new Set([...Object.keys(g), ...Object.keys(c)])
    const entries: StateDiff[] = []
    for (const key of keys) {
      const gv = g[key] ?? ''
      const cv = c[key] ?? ''
      if (gv !== cv) entries.push({ property: key, golden: gv, current: cv })
    }
    if (entries.length)
      propertyDiffs[state] = entries.sort((a, b) => a.property.localeCompare(b.property))
  }
  return { propertyDiffs, missingStates, extraStates }
}

function padRight(s: string, n: number): string {
  return s.length >= n ? s : s + ' '.repeat(n - s.length)
}

function printResult(r: FileResult): void {
  const rel = relative(ROOT, r.configPath)
  if (r.status === 'error') {
    console.log(`\n  ✗ ${r.name || rel} — error: ${r.error}`)
    return
  }
  if (r.status === 'baseline') {
    console.log(`  + ${r.name}  ${relative(ROOT, r.goldenPath)} (baseline written)`)
    return
  }
  if (r.status === 'updated') {
    console.log(`  ↻ ${r.name}  ${relative(ROOT, r.goldenPath)} (updated)`)
    return
  }
  if (r.status === 'match') {
    console.log(`  ✓ ${r.name}`)
    return
  }
  console.log(`\n  ✗ ${r.name}  ${rel}`)
  for (const state of r.missingStates) {
    console.log(`      state missing in current run: "${state}"`)
  }
  for (const state of r.extraStates) {
    console.log(`      state not in golden: "${state}" (run --update to accept)`)
  }
  for (const [state, entries] of Object.entries(r.diffs)) {
    console.log(`      › ${state}`)
    const keyWidth = Math.min(
      32,
      entries.reduce((m, e) => Math.max(m, e.property.length + 1), 0),
    )
    for (const e of entries) {
      console.log(
        `        ${padRight(`${e.property}:`, keyWidth)}  ${e.golden || '∅'}  →  ${e.current || '∅'}`,
      )
    }
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  console.log(`vr — base URL: ${args.baseUrl}${args.update ? '  (updating goldens)' : ''}`)

  if (!(await reachable(args.baseUrl))) {
    console.error(
      `\n  ✗ base URL not reachable: ${args.baseUrl}\n    Start the app first (e.g. \`npm run dev\`) or pass --url.`,
    )
    process.exit(2)
  }

  const files = await walk(ROOT)
  if (!files.length) {
    console.log(`  no ${TEST_GLOB_SUFFIX} files found under ${ROOT}`)
    return
  }
  console.log(`  discovered ${files.length} test file${files.length === 1 ? '' : 's'}`)

  let browser: Browser | null = null
  const results: FileResult[] = []
  try {
    browser = await chromium.launch()
    const ctx = await browser.newContext()
    for (const file of files) {
      const res = await runConfig(ctx, args, file)
      results.push(res)
      printResult(res)
    }
    await ctx.close()
  } finally {
    await browser?.close().catch(() => {})
  }

  const summary = {
    match: results.filter((r) => r.status === 'match').length,
    diff: results.filter((r) => r.status === 'diff').length,
    baseline: results.filter((r) => r.status === 'baseline').length,
    updated: results.filter((r) => r.status === 'updated').length,
    error: results.filter((r) => r.status === 'error').length,
  }
  console.log(
    `\n  ${summary.match} match · ${summary.diff} diff · ${summary.baseline} baseline · ${summary.updated} updated · ${summary.error} error`,
  )

  const failed = summary.diff + summary.error
  process.exit(failed ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
