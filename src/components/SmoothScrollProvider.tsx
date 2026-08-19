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
 *
 * NOTE: globals.css ships Lenis's required companion rules
 * (`.lenis.lenis-smooth { scroll-behavior: auto !important }` etc.).
 * Without them, the `scroll-behavior: smooth` on <html> re-animates
 * every per-frame programmatic scroll Lenis writes, and the two
 * animations fight — which reads as micro-judder, not smoothness.
 */

let active: Lenis | null = null

/**
 * Programmatic smooth scroll for the rest of the app. Routes through
 * Lenis when it is running so everything glides with the same
 * physics; falls back to the browser's own smooth scroll otherwise
 * (reduced motion, SSR, or before mount).
 */
export function smoothScrollTo(
  target: string | number | HTMLElement,
  options?: { duration?: number; offset?: number }
) {
  if (active) {
    active.scrollTo(target, {
      duration: options?.duration ?? 1.4,
      offset: options?.offset ?? 0,
    })
    return
  }
  const el =
    typeof target === 'string' ? document.querySelector(target) : null
  if (el instanceof HTMLElement) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  } else if (typeof target === 'number') {
    window.scrollTo({ top: target, behavior: 'smooth' })
  }
}

export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    if (reduceMotion) return

    const lenis = new Lenis({
      // Was 0.7s with an expo-out curve. Quart-out starts gentler and
      // carries a longer, softer deceleration, which is what makes the
      // page read as "gliding" rather than "arriving quickly". The old
      // 1.1s-extends-forever problem was mostly the CSS scroll-behavior
      // conflict (see file note), not the duration itself.
      duration: 1.0,
      easing: (t: number) => 1 - Math.pow(1 - t, 4), // quart-out
      smoothWheel: true,
      // Slightly finer wheel steps — the same travel spread over more,
      // smaller increments is perceivably smoother on notched wheels.
      wheelMultiplier: 0.95,
      touchMultiplier: 1.4,
      // Native momentum on touch is already smooth and hardware-driven;
      // running Lenis on top of it costs frames and fights the OS.
      syncTouch: false,
      // In-page #anchor links glide with the same easing instead of the
      // browser's default jump (or its own, different, smooth-scroll).
      anchors: { duration: 1.4 },
    })
    active = lenis

    let raf = 0
    const loop = (time: number) => {
      lenis.raf(time)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      lenis.destroy()
      active = null
    }
  }, [])

  return <>{children}</>
}
