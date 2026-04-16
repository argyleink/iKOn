'use client'

import type { Icon } from '@/lib/icons'
import { type RefObject, useEffect, useMemo, useReducer, useRef } from 'react'
import type { Mode } from './useCellAssembly'

/** Primitive content-key for a Mode. Used instead of the Mode object itself
 *  so the reducer can compare by value (string equality) — avoids spurious
 *  exit cycles when useMemo produces a new Mode reference whose content
 *  hasn't changed (e.g. clearing focus while deferredQuery lags one render
 *  behind, producing two back-to-back Modes with identical search content). */
function modeKey(mode: Mode): string {
  if (mode.kind === 'search') return `s:${mode.query}`
  if (mode.focus) return `f:${mode.focus.id}:${mode.originIndex ?? ''}`
  return 'browse'
}

/**
 * Finite state machine for the grid's exit-then-enter cycle.
 *
 * States:
 *   idle      — resting; no transition in flight.
 *   exiting   — `data-phase="exiting"` applied; layers transitioning to
 *               scale(0). Commit blocked until the `transform` transitionend
 *               bubbles up.
 *   mounting  — buffer phase AFTER exit has committed new icons but BEFORE
 *               their @starting-style enter transitions have had a chance
 *               to start (2 frames). Keystrokes during this window are
 *               buffered into `pendingMode` and applied when mounting
 *               completes. This is what eliminates the race where a fresh
 *               layer was still at scale(0) when a new exit was requested
 *               (same source and target value → no transition, stuck).
 *
 * `latestIconsRef` carries the freshest `cellIcons` so the commit inside
 * EXIT_COMPLETE picks up anything the user typed during the exit. Acts
 * like the abort-controller signal the user asked for: new typing takes
 * precedence over any in-flight state without racing the DOM.
 */

type Phase = 'idle' | 'exiting' | 'mounting'

type State = {
  phase: Phase
  displayedIcons: (Icon | null)[]
  prevModeKey: string | null
  /** Buffered mode change that arrived while the state machine was in a
   *  phase where exit couldn't safely begin (mounting). Applied on
   *  MOUNT_COMPLETE. Stored as a key (not a Mode) for the same reason as
   *  prevModeKey — content equality across reference-fresh rerenders. */
  pendingModeKey: string | null
  /** Were the currently-displayed icons hidden (opacity:0 via
   *  [data-hide-until-hover]) at the moment the last mode was committed?
   *  When true, a subsequent mode change skips the exit phase — there's
   *  nothing visible to animate out, and the perceived "double render"
   *  on clearing a zero-result search was actually a 350ms invisible exit
   *  followed by the real enter. */
  prevWasHidden: boolean
  /** Monotonic counter bumped on every transition INTO exiting or mounting.
   *  Used as an effect dep so that React batches which collapse two
   *  consecutive phase transitions (e.g. MOUNT_COMPLETE→idle plus a
   *  skip-exit→mounting that arrive in the same microtask) still re-run
   *  the phase effects. Without this, the intermediate 'idle' state is
   *  never rendered, the effect sees 'mounting'→'mounting', and the 2-rAF
   *  MOUNT_COMPLETE scheduler never fires for the new cycle. */
  phaseTick: number
}

type Action =
  | { type: 'INPUT_CHANGED'; modeKey: string; cellIcons: (Icon | null)[]; hidden: boolean }
  | { type: 'EXIT_COMPLETE'; cellIcons: (Icon | null)[] }
  | { type: 'MOUNT_COMPLETE' }

function reducer(state: State, action: Action): State {
  const bump = (phase: Phase): number =>
    phase === state.phase ? state.phaseTick : state.phaseTick + 1
  switch (action.type) {
    case 'INPUT_CHANGED': {
      const { modeKey: key, cellIcons, hidden } = action

      // First commit — enter without an exit.
      if (state.prevModeKey === null) {
        if (cellIcons.length === 0) return state
        return {
          phase: 'mounting',
          displayedIcons: cellIcons,
          prevModeKey: key,
          pendingModeKey: null,
          prevWasHidden: hidden,
          phaseTick: bump('mounting'),
        }
      }

      // Same mode (by content) — resize/layout-only. Only sync in place
      // while idle. This is the path that eliminates the double-render
      // when clearing the search: deferredQuery lags one render behind
      // `query`, so we briefly get two Modes with the same search content
      // but different references. Comparing by key collapses that pair.
      // `prevWasHidden` is kept in sync here so a later mode change picks
      // up the latest visibility (e.g. user typed garbage → hidden became
      // true → next clear should skip exit).
      if (state.prevModeKey === key) {
        if (state.phase === 'idle' && cellIcons !== state.displayedIcons) {
          return { ...state, displayedIcons: cellIcons, prevWasHidden: hidden }
        }
        if (state.prevWasHidden !== hidden) {
          return { ...state, prevWasHidden: hidden }
        }
        return state
      }

      // Real mode change.
      if (state.phase === 'mounting') {
        // Fresh layers haven't had time to start their enter transitions
        // yet — triggering exit now would leave them stuck at scale(0)
        // with no transition to fire. Buffer and apply on MOUNT_COMPLETE.
        return { ...state, pendingModeKey: key }
      }

      // Old layers were hidden — no point animating them out. Jump straight
      // to mounting so the user only sees the enter wave. @starting-style
      // on .layer will kick in when new icon ids remount the spans.
      if (state.prevWasHidden) {
        return {
          ...state,
          phase: 'mounting',
          displayedIcons: cellIcons,
          prevModeKey: key,
          pendingModeKey: null,
          prevWasHidden: hidden,
          phaseTick: bump('mounting'),
        }
      }

      return {
        ...state,
        phase: 'exiting',
        prevModeKey: key,
        pendingModeKey: null,
        prevWasHidden: hidden,
        phaseTick: bump('exiting'),
      }
    }
    case 'EXIT_COMPLETE':
      return {
        ...state,
        phase: 'mounting',
        displayedIcons: action.cellIcons,
        phaseTick: bump('mounting'),
      }
    case 'MOUNT_COMPLETE':
      // If input arrived during mounting, flush it into a new exit cycle.
      if (state.pendingModeKey) {
        return {
          ...state,
          phase: 'exiting',
          prevModeKey: state.pendingModeKey,
          pendingModeKey: null,
          phaseTick: bump('exiting'),
        }
      }
      return { ...state, phase: 'idle', phaseTick: bump('idle') }
  }
}

const initialState: State = {
  phase: 'idle',
  displayedIcons: [],
  prevModeKey: null,
  pendingModeKey: null,
  prevWasHidden: false,
  phaseTick: 0,
}

export function useSwapCycle(
  mode: Mode,
  cellIcons: (Icon | null)[],
  gridRef: RefObject<HTMLElement | null>,
  iconsHidden: boolean,
) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const latestIconsRef = useRef(cellIcons)
  latestIconsRef.current = cellIcons

  const key = useMemo(() => modeKey(mode), [mode])

  useEffect(() => {
    dispatch({ type: 'INPUT_CHANGED', modeKey: key, cellIcons, hidden: iconsHidden })
  }, [key, cellIcons, iconsHidden])

  // Exit completion: normally fires on the transform transitionend, but if
  // the prior exit interrupted a barely-started mount, the layers are already
  // at scale(0) when [data-phase="exiting"] re-applies — that's a no-op in
  // the browser (no value change → no transition → no transitionend). A
  // safety timeout guarantees the state machine always progresses: whichever
  // of the two completes first wins.
  useEffect(() => {
    if (state.phase !== 'exiting') return
    const el = gridRef.current
    if (!el) return

    let timeoutId: number | null = null
    const complete = () => {
      if (timeoutId !== null) window.clearTimeout(timeoutId)
      timeoutId = null
      el.removeEventListener('transitionend', onEnd)
      dispatch({ type: 'EXIT_COMPLETE', cellIcons: latestIconsRef.current })
    }
    const onEnd = (e: TransitionEvent) => {
      if (e.propertyName !== 'transform') return
      complete()
    }
    el.addEventListener('transitionend', onEnd)
    // 500ms = ~350ms --swap-out duration + buffer. If transitionend never
    // fires (the scale(0)→scale(0) no-op case), this forces progress.
    timeoutId = window.setTimeout(complete, 500)
    return () => {
      if (timeoutId !== null) window.clearTimeout(timeoutId)
      el.removeEventListener('transitionend', onEnd)
    }
  }, [state.phase, state.phaseTick, gridRef])

  // Mounting buffer — waits 2 frames so newly-mounted layers have a chance
  // to paint at their @starting-style value (scale 0) and kick off their
  // enter transition BEFORE any queued exit can take over. Without this
  // window, fast typing could apply `data-phase="exiting"` while layers
  // were still at scale(0), producing a stuck no-op transition.
  useEffect(() => {
    if (state.phase !== 'mounting') return
    let raf1 = 0
    let raf2 = 0
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => dispatch({ type: 'MOUNT_COMPLETE' }))
    })
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
  }, [state.phase, state.phaseTick])

  return { phase: state.phase, displayedIcons: state.displayedIcons }
}
