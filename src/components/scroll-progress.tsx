'use client'

import { motion, useScroll, useSpring, useReducedMotion } from 'framer-motion'

/**
 * ScrollProgress — a thin emerald progress bar pinned to the very top of the
 * viewport, tracking whole-page scroll progress. Subtle, premium.
 */
export function ScrollProgress() {
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 28,
    restDelta: 0.001,
  })

  if (reduce) return null

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[2px] origin-left"
      style={{
        scaleX,
        background:
          'linear-gradient(90deg, transparent 0%, var(--primary) 30%, color-mix(in oklch, var(--primary) 60%, #fb7c5c) 70%, transparent 100%)',
        boxShadow: '0 0 12px color-mix(in oklch, var(--primary) 60%, transparent)',
      }}
    />
  )
}
