'use client'

import { useEffect } from 'react'

/**
 * Fires `onShake` when a user shakes the device. Uses DeviceMotion events,
 * which require permission on iOS Safari 13+ (user gesture to request).
 * If permission is denied or the API is unavailable, the hook no-ops
 * gracefully — desktop users still have the `$` shortcut.
 */
export function useShake(onShake: () => void, threshold = 22) {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (typeof DeviceMotionEvent === 'undefined') return

    let lastFired = 0
    const COOLDOWN_MS = 1200

    const handler = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity
      if (!a) return
      const { x = 0, y = 0, z = 0 } = a
      const magnitude = Math.sqrt((x ?? 0) ** 2 + (y ?? 0) ** 2 + (z ?? 0) ** 2)
      // `magnitude` hovers around 9.8 at rest (gravity); shaking pushes it past
      // ~20. We subtract gravity and check against the configured threshold.
      if (Math.abs(magnitude - 9.8) > threshold) {
        const now = Date.now()
        if (now - lastFired < COOLDOWN_MS) return
        lastFired = now
        onShake()
      }
    }

    // iOS 13+ gated permission model. We request on the first user gesture
    // (touchend) to avoid the auto-reject when called from a passive path.
    const requestPermissionIfNeeded = async () => {
      const cls = DeviceMotionEvent as unknown as {
        requestPermission?: () => Promise<'granted' | 'denied'>
      }
      if (typeof cls.requestPermission === 'function') {
        try {
          const result = await cls.requestPermission()
          if (result !== 'granted') return
        } catch {
          return
        }
      }
      window.addEventListener('devicemotion', handler)
    }

    // Attach the permission probe on first tap so iOS accepts the prompt.
    const probe = () => {
      document.removeEventListener('touchend', probe)
      requestPermissionIfNeeded()
    }

    // On browsers without the permission API (Android, desktop with motion),
    // we can attach immediately. Feature-detect via the constructor's method.
    const cls = DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>
    }
    if (typeof cls.requestPermission === 'function') {
      document.addEventListener('touchend', probe, { once: true })
    } else {
      window.addEventListener('devicemotion', handler)
    }

    return () => {
      document.removeEventListener('touchend', probe)
      window.removeEventListener('devicemotion', handler)
    }
  }, [onShake, threshold])
}
