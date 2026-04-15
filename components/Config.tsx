'use client'

import { useEffect } from 'react'
import styles from './Config.module.css'

export type ConfigValues = {
  cellPx: number
  gapPx: number
  ringStepMs: number
  swapInMs: number
  swapOutMs: number
  exitPushPx: number
  waveOffsetMs: number
  aftershockDelayMs: number
  aftershockAmount: number
  resizeDebounceMs: number
  bg: string
  fg: string
  accent: string
  curve: keyof typeof SPRING_CURVES
  originFromCenter: boolean
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
  swapOutMs: 460,
  exitPushPx: 44,
  waveOffsetMs: 260,
  aftershockDelayMs: 140,
  aftershockAmount: 0.08,
  resizeDebounceMs: 300,
  bg: '#000000',
  fg: '#ffffff',
  accent: '#ff6a1a',
  curve: 'ripple',
  originFromCenter: true,
}

export function applyConfig(cfg: ConfigValues) {
  const r = document.documentElement.style
  r.setProperty('--cell', `${cfg.cellPx}px`)
  r.setProperty('--gap', `${cfg.gapPx}px`)
  r.setProperty('--ring-step', `${cfg.ringStepMs}ms`)
  r.setProperty('--swap-in', `${cfg.swapInMs}ms`)
  r.setProperty('--swap-out', `${cfg.swapOutMs}ms`)
  r.setProperty('--exit-push', `${cfg.exitPushPx}px`)
  r.setProperty('--wave-offset', `${cfg.waveOffsetMs}ms`)
  r.setProperty('--aftershock-delay', `${cfg.aftershockDelayMs}ms`)
  r.setProperty('--aftershock-amount', `${cfg.aftershockAmount}`)
  r.setProperty('--bg', cfg.bg)
  r.setProperty('--fg', cfg.fg)
  r.setProperty('--accent', cfg.accent)
  r.setProperty('--spring', SPRING_CURVES[cfg.curve])
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
    <aside className={styles.panel} aria-label="config">
      <header className={styles.header}>
        <span>$ secret controls</span>
        <button type="button" onClick={onClose} className={styles.close} aria-label="close">
          ×
        </button>
      </header>

      <div className={styles.section}>layout</div>
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
      <Slider
        label="resize debounce (ms)"
        min={0}
        max={1000}
        step={50}
        value={values.resizeDebounceMs}
        onChange={(v) => set('resizeDebounceMs', v)}
      />

      <div className={styles.section}>motion</div>
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
      <Slider
        label="exit push (px)"
        min={0}
        max={96}
        step={2}
        value={values.exitPushPx}
        onChange={(v) => set('exitPushPx', v)}
      />
      <Slider
        label="wave offset (ms)"
        min={0}
        max={800}
        step={20}
        value={values.waveOffsetMs}
        onChange={(v) => set('waveOffsetMs', v)}
      />

      <label className={styles.row}>
        <span className={styles.label}>anchor entry at origin</span>
        <input
          type="checkbox"
          className={styles.toggle}
          checked={values.originFromCenter}
          onChange={(e) => set('originFromCenter', e.target.checked)}
        />
        <span className={styles.value}>{values.originFromCenter ? 'on' : 'off'}</span>
      </label>

      <label className={styles.row}>
        <span className={styles.label}>spring curve</span>
        <select
          className={styles.select}
          value={values.curve}
          onChange={(e) => set('curve', e.target.value as ConfigValues['curve'])}
        >
          {Object.keys(SPRING_CURVES).map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </label>

      <div className={styles.section}>color</div>
      <ColorRow label="background" value={values.bg} onChange={(v) => set('bg', v)} />
      <ColorRow label="foreground" value={values.fg} onChange={(v) => set('fg', v)} />
      <ColorRow label="accent" value={values.accent} onChange={(v) => set('accent', v)} />

      <footer className={styles.footer}>
        <button type="button" className={styles.reset} onClick={() => onChange(DEFAULT_CONFIG)}>
          reset all
        </button>
        <span className={styles.hint}>$ to toggle · esc to close</span>
      </footer>
    </aside>
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
    <label className={styles.row}>
      <span className={styles.label}>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={styles.range}
      />
      <span className={styles.value}>{value}</span>
    </label>
  )
}

function ColorRow({
  label,
  value,
  onChange,
}: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className={styles.row}>
      <span className={styles.label}>{label}</span>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={styles.color}
      />
      <span className={styles.value}>{value}</span>
    </label>
  )
}
