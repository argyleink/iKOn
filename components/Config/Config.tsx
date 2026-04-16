'use client'

import { useEffect } from 'react'
import styles from './Config.module.css'

export type ConfigValues = {
  cellPx: number
  gapPx: number
  ringStepMs: number
  swapInMs: number
  swapOutMs: number
  enterScale: number
  bg: string
  fg: string
  spring: keyof typeof SPRING_VARS
  hideUntilHover: boolean
}

/** Spring options reference open-props CSS vars (see easings.min.css). */
export const SPRING_VARS = {
  'spring 1': 'var(--ease-spring-1)',
  'spring 2': 'var(--ease-spring-2)',
  'spring 3': 'var(--ease-spring-3)',
  'spring 4': 'var(--ease-spring-4)',
  'spring 5': 'var(--ease-spring-5)',
} as const

export const DEFAULT_CONFIG: ConfigValues = {
  cellPx: 48,
  gapPx: 1,
  ringStepMs: 38,
  swapInMs: 720,
  swapOutMs: 350,
  enterScale: 1,
  bg: '#000000',
  fg: '#ffffff',
  spring: 'spring 3',
  hideUntilHover: false,
}

export const INITIAL_VARS: Record<string, string> = {
  '--bg': '#000000',
  '--fg': '#ffffff',
  '--dim': 'color-mix(in oklab, #ffffff 42%, transparent)',
  '--faint': 'color-mix(in oklab, #ffffff 10%, transparent)',
  '--accent': '#ff6a1a',
  '--cell': '48px',
  '--gap': '1px',
  '--swap-in': '720ms',
  '--swap-out': '350ms',
  '--enter-scale': '1',
  // `--spring` points at one of open-props's `--ease-spring-*` vars.
  // CSS files use `var(--spring)` so the user's choice takes effect
  // without overriding open-props's own definitions.
  '--spring': 'var(--ease-spring-3)',
  '--selection': 'color(display-p3 0.2 1 0.6)',
  '--outline': 'color(display-p3 1 0.1 0.45)',
}

const reducedMotion =
  typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null

export function applyConfig(cfg: ConfigValues, el: HTMLElement) {
  const s = el.style
  s.setProperty('--cell', `${cfg.cellPx}px`)
  s.setProperty('--gap', `${cfg.gapPx}px`)
  s.setProperty('--swap-in', `${cfg.swapInMs}ms`)
  s.setProperty('--swap-out', `${cfg.swapOutMs}ms`)
  s.setProperty('--enter-scale', String(cfg.enterScale))
  s.setProperty('--bg', cfg.bg)
  s.setProperty('--fg', cfg.fg)
  s.setProperty('--dim', `color-mix(in oklab, ${cfg.fg} 42%, transparent)`)
  s.setProperty('--faint', `color-mix(in oklab, ${cfg.fg} 10%, transparent)`)
  // Never override open-props's own `--ease-spring-*` vars; instead
  // point the app's `--spring` alias at the user's chosen one.
  s.setProperty('--spring', reducedMotion?.matches ? 'linear(0, 1)' : SPRING_VARS[cfg.spring])
}

type Props = {
  open: boolean
  values: ConfigValues
  onChange: (v: ConfigValues) => void
  onClose: () => void
}

export function Config({ open, values, onChange, onClose }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const set = <K extends keyof ConfigValues>(key: K, v: ConfigValues[K]) =>
    onChange({ ...values, [key]: v })

  return (
    <aside
      className={`fixed z-[200] bg-bg border border-faint text-fg text-[10px] tracking-[0.08em] backdrop-blur-md overflow-y-auto [scrollbar-width:thin] inset-0 w-full max-h-none p-4 sm:inset-auto sm:top-4 sm:right-4 sm:w-80 sm:max-h-[calc(100vh-32px)] sm:p-3.5 ${styles.panel}`}
      aria-label="config"
    >
      <header className="flex items-center justify-between pb-2.5 border-b border-faint text-fg uppercase">
        <span className="font-bold">$ secret controls</span>
        <button
          type="button"
          onClick={onClose}
          className="bg-transparent border-0 text-dim text-[16px] cursor-pointer px-1 leading-none transition-colors duration-150 hover:text-fg superellipse"
          aria-label="close"
        >
          ×
        </button>
      </header>

      <Section>layout</Section>
      <Slider
        label="cell size (px)"
        min={24}
        max={128}
        step={2}
        value={values.cellPx}
        onChange={(v) => set('cellPx', v)}
      />
      <Slider
        label="gap (px)"
        min={0}
        max={8}
        step={1}
        value={values.gapPx}
        onChange={(v) => set('gapPx', v)}
      />

      <Section>motion</Section>
      <Slider
        label="ring step (ms/cell)"
        min={0}
        max={240}
        step={1}
        value={values.ringStepMs}
        onChange={(v) => set('ringStepMs', v)}
      />
      <Slider
        label="enter duration (ms)"
        min={120}
        max={2400}
        step={20}
        value={values.swapInMs}
        onChange={(v) => set('swapInMs', v)}
      />
      <Slider
        label="exit duration (ms)"
        min={120}
        max={1600}
        step={20}
        value={values.swapOutMs}
        onChange={(v) => set('swapOutMs', v)}
      />
      <Slider
        label="enter scale (×)"
        min={0.5}
        max={1.5}
        step={0.05}
        value={values.enterScale}
        onChange={(v) => set('enterScale', v)}
      />
      <Row>
        <span className="text-dim whitespace-nowrap">spring</span>
        <select
          className={`col-span-2 bg-transparent border border-faint text-fg py-[3px] px-1.5 font-[inherit] uppercase cursor-pointer superellipse ${styles.select}`}
          value={values.spring}
          onChange={(e) => set('spring', e.target.value as ConfigValues['spring'])}
        >
          {Object.keys(SPRING_VARS).map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </Row>

      <Section>discovery</Section>
      <Row>
        <span className="text-dim whitespace-nowrap">hide icons until hover</span>
        <input
          type="checkbox"
          className="col-span-2 justify-self-start w-4 h-4 accent-[var(--accent)] cursor-pointer"
          checked={values.hideUntilHover}
          onChange={(e) => set('hideUntilHover', e.target.checked)}
        />
      </Row>

      <Section>color</Section>
      <ColorRow label="background" value={values.bg} onChange={(v) => set('bg', v)} />
      <ColorRow label="foreground" value={values.fg} onChange={(v) => set('fg', v)} />

      <footer className="flex items-center justify-between mt-3 pt-2.5 border-t border-faint text-dim">
        <button
          type="button"
          className="bg-transparent border border-faint text-fg px-2.5 py-1 font-[inherit] uppercase cursor-pointer transition-[border-color,color] duration-150 hover:[border-color:var(--outline)] hover:[color:var(--outline)] superellipse"
          onClick={() => onChange(DEFAULT_CONFIG)}
        >
          reset all
        </button>
        <span className="text-[9px] tracking-[0.12em]">$ to toggle · esc to close</span>
      </footer>
    </aside>
  )
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 mb-1 text-dim uppercase tracking-[0.14em] text-[9px] font-bold">
      {children}
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: control is always nested as a child
    <label className="grid grid-cols-[1fr_1.2fr_auto] items-center gap-2.5 py-1 uppercase">
      {children}
    </label>
  )
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string
  min: number
  max: number
  step: number
  value: number
  onChange: (v: number) => void
}) {
  return (
    <Row>
      <span className="text-dim whitespace-nowrap">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={styles.range}
      />
      <span className="text-fg tabular-nums text-right min-w-12 text-[10px]">{value}</span>
    </Row>
  )
}

function ColorRow({
  label,
  value,
  onChange,
}: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Row>
      <span className="text-dim whitespace-nowrap">{label}</span>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`appearance-none border border-faint bg-transparent w-full h-5 p-0 cursor-pointer ${styles.color}`}
      />
      <span className="text-fg tabular-nums text-right min-w-12 text-[10px]">{value}</span>
    </Row>
  )
}
