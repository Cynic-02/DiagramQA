'use client'

import { useEffect } from 'react'
import Lenis from 'lenis'

/**
 * SmoothScrollProvider — buttery inertia scrolling site-wide, using
 * Lenis in its default "native scroll" mode: it smooths the actual
 * document scroll position rather than hijacking it into a virtual
 * container, so window.scrollY / IntersectionObserver / Framer
 * Motion's useScroll all keep working exactly as before — nothing
 * downstream needs to change to benefit from it.
 *
 * Respects prefers-reduced-motion (skips Lenis entirely, leaving
 * native browser scroll) and is destroyed on unmount.
 */
export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    if (reduceMotion) return

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // expo-out
      smoothWheel: true,
      touchMultiplier: 1.4,
    })

    let raf = 0
    const loop = (time: number) => {
      lenis.raf(time)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      lenis.destroy()
    }
  }, [])

  return <>{children}</>
}
