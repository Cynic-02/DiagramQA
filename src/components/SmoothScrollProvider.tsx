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
      // Was 1.1s. Every wheel tick became a 1.1-second animation, so the
      // page kept gliding long after the input stopped — which reads as
      // input lag rather than smoothness, and holds the compositor busy
      // (re-blurring the sticky chrome) for the whole duration. 0.7s
      // still smooths the steps without feeling detached from the wheel.
      duration: 0.7,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // expo-out
      smoothWheel: true,
      touchMultiplier: 1.4,
      // Native momentum on touch is already smooth and hardware-driven;
      // running Lenis on top of it costs frames and fights the OS.
      syncTouch: false,
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
