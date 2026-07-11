'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * useCountUp — animates a number from 0 → `target` over `duration` ms.
 *
 * Uses requestAnimationFrame with an ease-out cubic. Only animates on mount
 * (or when `target` changes). Respects prefers-reduced-motion by snapping
 * instantly. Returns the current animated value.
 *
 * @example
 * const v = useCountUp(42, 800)
 * // v goes 0 → 42 over 800ms
 */
export function useCountUp(target: number, duration = 900): number {
  // Detect reduced-motion once (lazy init) so the effect can skip cleanly
  // without an in-effect setState.
  const [reduce] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  const [value, setValue] = useState(0)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)
  const fromRef = useRef(0)

  useEffect(() => {
    // reduced motion or zero target → no animation, no rAF
    if (reduce || target === 0) return

    fromRef.current = value
    startRef.current = null

    const ease = (t: number) => 1 - Math.pow(1 - t, 3) // ease-out cubic

    const tick = (ts: number) => {
      if (startRef.current === null) startRef.current = ts
      const elapsed = ts - startRef.current
      const t = Math.min(1, elapsed / duration)
      const next = fromRef.current + (target - fromRef.current) * ease(t)
      setValue(next)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        setValue(target)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [target, duration, reduce])

  // When not animating, just reflect the target directly.
  return reduce || target === 0 ? target : value
}

/**
 * CountUpText — convenience wrapper that renders the animated number
 * formatted with `formatter`. Defaults to rounding to the nearest integer.
 *
 * @example <CountUpText value={42} />
 * @example <CountUpText value={0.87} duration={1000} formatter={(v) => `${Math.round(v*100)}%`} />
 */
export function CountUpText({
  value,
  duration = 900,
  formatter = (v) => String(Math.round(v)),
  className,
}: {
  value: number
  duration?: number
  formatter?: (v: number) => string
  className?: string
}) {
  const v = useCountUp(value, duration)
  return <span className={className}>{formatter(v)}</span>
}
