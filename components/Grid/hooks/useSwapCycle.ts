'use client'

import { type RefObject, useEffect, useReducer, useRef } from 'react'
import type { Icon } from '@/lib/icons'
import type { Mode } from './useCellAssembly'

/**
 * Finite state machine for the grid's exit-then-enter cycle.
 *
 * States:
 *   idle     — resting; layers are at scale(1); no transition running.
 *   exiting  — `data-phase="exiting"` applied; layers transitioning to
 *              scale(0); committing the new icon set is blocked until the
 *              `transform` transitionend bubbles up.
 *
 * Because the enter animation is carried entirely by CSS @starting-style
 * on freshly-mounted layer spans (each is keyed by icon id), there is NO
 * third "entering" state — the new layers mount under `data-phase="idle"`
 * and transition from scale(0) to scale(1) automatically. That eliminates
 * the old race condition where fast typing during the idle-gap between
 * exit end and an rAF-scheduled `data-entered=true` left layers stuck at
 * scale(0) with no transition to fire (same source and target value).
 */

type Phase = 'idle' | 'exiting'

type State = {
  phase: Phase
  displayedIcons: (Icon | null)[]
  prevMode: Mode | null
}

type Action =
  | { type: 'INPUT_CHANGED'; mode: Mode; cellIcons: (Icon | null)[] }
  | { type: 'EXIT_COMPLETE'; cellIcons: (Icon | null)[] }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'INPUT_CHANGED': {
      const { mode, cellIcons } = action
      // First commit ever — just show the icons, no exit.
      if (state.prevMode === null) {
        if (cellIcons.length === 0) return state
        return { phase: 'idle', displayedIcons: cellIcons, prevMode: mode }
      }
      // Same mode (resize / layout-only): sync displayedIcons in place if
      // we're idle; during exit, ignore — the new icons will be picked up
      // via `latestIconsRef` at exit completion time.
      if (state.prevMode === mode) {
        if (state.phase === 'idle' && cellIcons !== state.displayedIcons) {
          return { ...state, displayedIcons: cellIcons }
        }
        return state
      }
      // Real mode change → start exit. If already exiting, just update
      // prevMode; the in-flight exit will commit the latest cellIcons when
      // its transitionend fires.
      return { phase: 'exiting', displayedIcons: state.displayedIcons, prevMode: mode }
    }
    case 'EXIT_COMPLETE':
      // Commit the latest icons and return to idle. New layer spans mount
      // fresh (keyed by new icon ids) and auto-animate via @starting-style.
      return { ...state, phase: 'idle', displayedIcons: action.cellIcons }
  }
}

const initialState: State = {
  phase: 'idle',
  displayedIcons: [],
  prevMode: null,
}

export function useSwapCycle(
  mode: Mode,
  cellIcons: (Icon | null)[],
  gridRef: RefObject<HTMLElement | null>,
) {
  const [state, dispatch] = useReducer(reducer, initialState)

  // Always carry the newest cellIcons so an in-flight exit commits them
  // when its transitionend arrives — fast typing batches into one cycle.
  const latestIconsRef = useRef(cellIcons)
  latestIconsRef.current = cellIcons

  // Mode / cellIcons changes flow through the reducer.
  useEffect(() => {
    dispatch({ type: 'INPUT_CHANGED', mode, cellIcons })
  }, [mode, cellIcons])

  // Exit completion: listen for the uniform transform transitionend on the
  // grid wrapper. Filter by propertyName so an opacity event (from hover)
  // doesn't prematurely close the cycle.
  useEffect(() => {
    if (state.phase !== 'exiting') return
    const el = gridRef.current
    if (!el) return

    const onEnd = (e: TransitionEvent) => {
      if (e.propertyName !== 'transform') return
      el.removeEventListener('transitionend', onEnd)
      dispatch({ type: 'EXIT_COMPLETE', cellIcons: latestIconsRef.current })
    }
    el.addEventListener('transitionend', onEnd)
    return () => el.removeEventListener('transitionend', onEnd)
  }, [state.phase, gridRef])

  return { phase: state.phase, displayedIcons: state.displayedIcons }
}
