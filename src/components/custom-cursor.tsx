'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

/**
 * CustomCursor — a premium two-part cursor: a small dot that tracks instantly
 * and a larger ring that lags with spring physics. Grows on hover over
 * interactive elements. Disabled on touch devices.
 *
 * This is the signature interaction of world-class sites (Linear, Vercel,
 * Arc). Subtle but immediately elevates the perceived quality.
 */
export function CustomCursor() {
  const [enabled] = useState(() => {
    if (typeof window === 'undefined') return false
    const isTouch = window.matchMedia('(pointer: coarse)').matches
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    return !isTouch && !reduce
  })
  const [hovering, setHovering] = useState(false)
  const [pressed, setPressed] = useState(false)

  const dotX = useMotionValue(-100)
  const dotY = useMotionValue(-100)
  const ringX = useSpring(dotX, { stiffness: 350, damping: 28, mass: 0.4 })
  const ringY = useSpring(dotY, { stiffness: 350, damping: 28, mass: 0.4 })

  useEffect(() => {
    if (!enabled) return

    const dotMove = (e: PointerEvent) => {
      dotX.set(e.clientX)
      dotY.set(e.clientY)
    }
    const down = () => setPressed(true)
    const up = () => setPressed(false)

    const checkHover = (e: PointerEvent) => {
      const el = e.target as HTMLElement
      const interactive = el.closest(
        'a, button, [role="button"], input, textarea, select, [data-cursor="hover"]'
      )
      setHovering(!!interactive)
    }

    window.addEventListener('pointermove', dotMove, { passive: true })
    window.addEventListener('pointermove', checkHover, { passive: true })
    window.addEventListener('pointerdown', down)
    window.addEventListener('pointerup', up)
    document.documentElement.style.cursor = 'none'

    return () => {
      window.removeEventListener('pointermove', dotMove)
      window.removeEventListener('pointermove', checkHover)
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', up)
      document.documentElement.style.cursor = ''
    }
  }, [dotX, dotY])

  if (!enabled) return null

  return (
    <>
      {/* dot — instant track */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[9998] rounded-full"
        style={{
          x: dotX,
          y: dotY,
          width: 6,
          height: 6,
          translateX: '-50%',
          translateY: '-50%',
          backgroundColor: 'var(--primary)',
        }}
        animate={{ scale: pressed ? 0.5 : 1 }}
        transition={{ duration: 0.15 }}
      />
      {/* ring — spring-lagged */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[9998] rounded-full border"
        style={{
          x: ringX,
          y: ringY,
          translateX: '-50%',
          translateY: '-50%',
          borderColor: 'color-mix(in srgb, var(--primary) 30%, transparent)',
        }}
        animate={{
          width: hovering ? 42 : 20,
          height: hovering ? 42 : 20,
          opacity: hovering ? 1 : 0.5,
          borderColor: hovering
            ? 'color-mix(in srgb, var(--primary) 70%, transparent)'
            : 'color-mix(in srgb, var(--primary) 30%, transparent)',
        }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      />
    </>
  )
}
