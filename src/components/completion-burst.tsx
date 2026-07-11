'use client'

import * as React from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'

/**
 * CompletionBurst — a one-shot particle confetti that fires when the pipeline
 * completes successfully. Renders fixed, full-viewport, pointer-events-none.
 *
 * Fires when `trigger` transitions from false → true. Auto-clears after ~1.6s.
 * Respects prefers-reduced-motion (renders a simple flash instead).
 */

interface Particle {
  id: number
  x: number
  y: number
  angle: number
  velocity: number
  size: number
  color: string
  rotate: number
  delay: number
}

const COLORS = [
  'var(--primary)',
  'var(--secondary)',
  'var(--accent)',
  'var(--foreground)',
]

function makeParticles(count = 60): Particle[] {
  const cx = window.innerWidth / 2
  const cy = window.innerHeight * 0.42
  return Array.from({ length: count }, (_, i) => {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4
    const velocity = 280 + Math.random() * 340
    return {
      id: i,
      x: cx,
      y: cy,
      angle,
      velocity,
      size: 5 + Math.random() * 7,
      color: COLORS[i % COLORS.length],
      rotate: Math.random() * 360,
      delay: Math.random() * 0.08,
    }
  })
}

export function CompletionBurst({ trigger }: { trigger: boolean }) {
  const reduce = useReducedMotion()
  const [particles, setParticles] = React.useState<Particle[]>([])
  const [show, setShow] = React.useState(false)
  const prev = React.useRef(false)

  React.useEffect(() => {
    if (trigger && !prev.current) {
      if (reduce) {
        setShow(true)
        const t = setTimeout(() => setShow(false), 700)
        prev.current = true
        return () => clearTimeout(t)
      }
      setParticles(makeParticles(70))
      setShow(true)
      const t = setTimeout(() => {
        setShow(false)
        setParticles([])
      }, 1900)
      prev.current = true
      return () => clearTimeout(t)
    }
    if (!trigger) prev.current = false
  }, [trigger, reduce])

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[70] overflow-hidden"
    >
      <AnimatePresence>
        {show && (
          <>
            {/* flat flash — solid color, no radial glow */}
            <motion.div
              key="flash"
              initial={{ opacity: 0 }}
              animate={{ opacity: reduce ? 0.12 : 0.18 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 bg-primary"
            />
            {/* particles */}
            {!reduce &&
              particles.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{
                    x: p.x,
                    y: p.y,
                    opacity: 1,
                    scale: 1,
                    rotate: p.rotate,
                  }}
                  animate={{
                    x: p.x + Math.cos(p.angle) * p.velocity,
                    y: p.y + Math.sin(p.angle) * p.velocity + 180, // gravity
                    opacity: 0,
                    scale: 0.4,
                    rotate: p.rotate + 540,
                  }}
                  transition={{
                    duration: 1.5,
                    delay: p.delay,
                    ease: [0.12, 0.4, 0.3, 1],
                  }}
                  className="absolute border border-border"
                  style={{
                    width: p.size,
                    height: p.size * 0.6,
                    backgroundColor: p.color,
                  }}
                />
              ))}
            {/* center check badge */}
            <motion.div
              key="badge"
              initial={{ opacity: 0, scale: 0.6, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -8 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="absolute left-1/2 top-[38%] flex -translate-x-1/2 flex-col items-center gap-2"
            >
              <div className="flex size-14 items-center justify-center border-[3px] border-border bg-accent text-accent-foreground shadow-[4px_4px_0_0_black]">
                <svg viewBox="0 0 24 24" className="size-7" fill="none">
                  <motion.path
                    d="M5 13l4 4L19 7"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.45, delay: 0.1, ease: 'easeOut' }}
                  />
                </svg>
              </div>
              <span className="border-[2px] border-border bg-background px-3 py-1 text-xs font-bold text-foreground shadow-[3px_3px_0_0_black]">
                Pipeline complete
              </span>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
