'use client'

import { TIP_INTERVAL_MS, useCyclingTip } from '../hooks/useCyclingTip'

/** Shown before the icon DB loads. Cycles through tips at 2× the search-
 *  input pace since the user has nothing else to read. */
export function Loader() {
  const { tip, idx } = useCyclingTip(true, TIP_INTERVAL_MS / 2)
  return (
    <div className="absolute inset-0 grid place-items-center pointer-events-none select-none">
      <div className="flex flex-col items-center gap-3 text-center px-6 max-w-sm">
        <span className="text-dim text-[11px] uppercase tracking-[0.14em]">loading icons…</span>
        <span
          key={idx}
          className="text-fg text-[13px] lowercase tracking-[0.04em] [animation:tip-reveal_520ms_var(--ease-out-3)]"
        >
          {tip}
        </span>
      </div>
    </div>
  )
}
