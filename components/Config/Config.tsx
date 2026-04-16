'use client'

import { useEffect } from 'react'
import styles from './Config.module.css'

export type ConfigValues = {
  cellPx: number
  gapPx: number
  ringStepMs: number
  swapInMs: number
  swapOutMs: number
  bg: string
  fg: string
  curve: keyof typeof SPRING_CURVES
  hideUntilHover: boolean
}

export const SPRING_CURVES = {
  ripple: `linear(
    0, 0.002, 0.012 2%, 0.055, 0.142 8%, 0.287, 0.486 16%, 0.72, 0.952 24%,
    1.13, 1.221 32%, 1.22, 1.158 38%, 1.055, 0.956 48%, 0.912, 0.928 58%,
    0.988 65%, 1.045 72%, 1.055 78%, 1.028 85%, 0.996 91%, 1
  )`,
  subtle: `linear(
    0, 0.009, 0.035 2.1%, 0.141, 0.3 8.1%, 0.516, 0.745 16.4%, 0.87, 0.957,
    1.015, 1.045, 1.055, 1.051, 1.035, 0.999 38.2%, 0.959, 0.926, 0.908,
    0.906 49.3%, 0.977 63.2%, 1.002 76.7%, 0.997 95.9%, 1
  )`,
  elastic: `linear(
    0, -0.02 5%, 0.05, 0.2 12%, 0.5, 0.9 25%, 1.25, 1.35 34%, 1.22, 1.05 45%,
    0.88, 0.85 55%, 0.95 65%, 1.08 74%, 1.05 82%, 0.98 90%, 1
  )`,
  snap: 'linear(0, 0.28 12%, 0.72 28%, 1.08 44%, 1.02 60%, 0.99 78%, 1)',
} as const

export const DEFAULT_CONFIG: ConfigValues = {
  cellPx: 48,
  gapPx: 1,
  ringStepMs: 38,
  swapInMs: 720,
  swapOutMs: 720,
  bg: '#000000',
  fg: '#ffffff',
  curve: 'ripple',
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
  '--swap-out': '720ms',
  '--spring': SPRING_CURVES.ripple,
  '--ease-out': 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  '--ease-fun': 'cubic-bezier(0.76, 0, 0.24, 1)',
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
  s.setProperty('--bg', cfg.bg)
  s.setProperty('--fg', cfg.fg)
  s.setProperty('--dim', `color-mix(in oklab, ${cfg.fg} 42%, transparent)`)
  s.setProperty('--faint', `color-mix(in oklab, ${cfg.fg} 10%, transparent)`)
  const reduce = reducedMotion?.matches
  s.setProperty('--spring', reduce ? 'linear(0, 1)' : SPRING_CURVES[cfg.curve])
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
      className={`fixed top-4 right-4 z-[200] w-80 p-3.5 bg-bg border border-faint text-fg text-[10px] tracking-[0.08em] backdrop-blur-md max-h-[calc(100vh-32px)] overflow-y-auto [scrollbar-width:thin] ${styles.panel}`}
      aria-label="config"
    >
      <header className="flex items-center justify-between pb-2.5 border-b border-faint text-fg uppercase">
        <span className="font-bold">$ secret controls</span>
        <button
          type="button"
          onClick={onClose}
          className="bg-transparent border-0 text-dim text-[16px] cursor-pointer px-1 leading-none transition-colors duration-150 hover:text-fg focus-visible:outline-2 focus-visible:outline-dashed focus-visible:[outline-color:var(--outline)] focus-visible:outline-offset-2"
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
        max={80}
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
      <Row>
        <span className="text-dim whitespace-nowrap">spring curve</span>
        <select
          className={`col-span-2 bg-transparent border border-faint text-fg py-[3px] px-1.5 font-[inherit] uppercase cursor-pointer focus-visible:outline-2 focus-visible:outline-dashed focus-visible:[outline-color:var(--outline)] focus-visible:outline-offset-2 ${styles.select}`}
          value={values.curve}
          onChange={(e) => set('curve', e.target.value as ConfigValues['curve'])}
        >
          {Object.keys(SPRING_CURVES).map((k) => (
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
          className="bg-transparent border border-faint text-fg px-2.5 py-1 font-[inherit] uppercase cursor-pointer transition-[border-color,color] duration-150 hover:[border-color:var(--outline)] hover:[color:var(--outline)] focus-visible:outline-2 focus-visible:outline-dashed focus-visible:[outline-color:var(--outline)] focus-visible:outline-offset-2"
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
