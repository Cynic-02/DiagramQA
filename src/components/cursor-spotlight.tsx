'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'

/**
 * CursorSpotlight — a soft radial glow that follows the pointer across the
 * whole page. Purely decorative; pointer-events:none, fixed, behind content.
 *
 * Disabled on touch devices (no pointer) and under prefers-reduced-motion.
 * Uses a single fixed div with a radial-gradient background whose center is
 * updated via CSS variables on every pointermove (throttled with rAF).
 */
export function CursorSpotlight() {
  const { theme } = useTheme()
  // Detect capability once on first client render (lazy initializer avoids
  // the setState-in-effect lint and any SSR mismatch — default false on server).
  const [enabled] = useState(() => {
    if (typeof window === 'undefined') return false
    const isTouch = window.matchMedia('(pointer: coarse)').matches
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    return !isTouch && !reduce
  })

  useEffect(() => {
    if (!enabled || theme?.startsWith('minimal')) return

    let raf = 0
    let mx = window.innerWidth / 2
    let my = window.innerHeight / 2
    const el = document.documentElement

    const onMove = (e: PointerEvent) => {
      mx = e.clientX
      my = e.clientY
      if (!raf) {
        raf = requestAnimationFrame(() => {
          raf = 0
          el.style.setProperty('--spot-x', `${mx}px`)
          el.style.setProperty('--spot-y', `${my}px`)
        })
      }
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    el.style.setProperty('--spot-x', `${mx}px`)
    el.style.setProperty('--spot-y', `${my}px`)
    return () => {
      window.removeEventListener('pointermove', onMove)
      if (raf) cancelAnimationFrame(raf)
      el.style.removeProperty('--spot-x')
      el.style.removeProperty('--spot-y')
    }
  }, [enabled, theme])

  if (!enabled || theme?.startsWith('minimal')) return null

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[1] transition-opacity duration-500"
      style={{
        background:
          'radial-gradient(420px circle at var(--spot-x, 50%) var(--spot-y, 50%), color-mix(in oklch, var(--primary) 7%, transparent), transparent 70%)',
        mixBlendMode: 'screen',
      }}
    />
  )
}
