'use client'

import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'

/**
 * AmbientOrbs — slow-floating, scroll-parallax gradient orbs that sit behind
 * the whole page and give the dark UI real depth and atmosphere.
 *
 * Emerald / teal / coral palette (NO indigo / blue / purple). Very low
 * opacity, heavily blurred, pointer-events-none. Disabled under reduced motion
 * (static positions, no drift).
 *
 * Mounted once at the page root, fixed full-viewport, z-0.
 */
export function AmbientOrbs() {
  const reduce = useReducedMotion()
  const { scrollY } = useScroll()

  // Different parallax speeds per orb layer
  const y1 = useTransform(scrollY, [0, 1200], [0, -180])
  const y2 = useTransform(scrollY, [0, 1200], [0, -260])
  const y3 = useTransform(scrollY, [0, 1200], [0, -120])
  const y4 = useTransform(scrollY, [0, 1200], [0, -220])

  if (reduce) {
    // static fallback — still render the orbs for depth, just no motion
    return (
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <Orb className="top-[-10%] left-[5%] h-[28rem] w-[28rem]" color="emerald" opacity={0.12} />
        <Orb className="top-[20%] right-[-8%] h-[32rem] w-[32rem]" color="coral" opacity={0.1} />
        <Orb className="bottom-[5%] left-[20%] h-[26rem] w-[26rem]" color="teal" opacity={0.1} />
        <Orb className="bottom-[-10%] right-[25%] h-[24rem] w-[24rem]" color="amber" opacity={0.08} />
      </div>
    )
  }

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Emerald — top left */}
      <motion.div style={{ y: y1 }} className="absolute top-[-10%] left-[5%]">
        <Orb className="h-[28rem] w-[28rem]" color="emerald" opacity={0.12} drift />
      </motion.div>

      {/* Coral — top right */}
      <motion.div style={{ y: y2 }} className="absolute top-[18%] right-[-8%]">
        <Orb className="h-[32rem] w-[32rem]" color="coral" opacity={0.1} drift delay={2} />
      </motion.div>

      {/* Teal — middle left */}
      <motion.div style={{ y: y3 }} className="absolute bottom-[12%] left-[18%]">
        <Orb className="h-[26rem] w-[26rem]" color="teal" opacity={0.1} drift delay={4} />
      </motion.div>

      {/* Amber — bottom right */}
      <motion.div style={{ y: y4 }} className="absolute bottom-[-8%] right-[22%]">
        <Orb className="h-[24rem] w-[24rem]" color="amber" opacity={0.08} drift delay={6} />
      </motion.div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

const COLORS: Record<string, string> = {
  emerald: 'radial-gradient(circle at 30% 30%, oklch(0.82 0.15 65), oklch(0.6 0.14 65 / 0.4) 60%, transparent 75%)',
  coral: 'radial-gradient(circle at 30% 30%, oklch(0.72 0.19 25), oklch(0.55 0.16 25 / 0.4) 60%, transparent 75%)',
  teal: 'radial-gradient(circle at 30% 30%, oklch(0.7 0.14 340), oklch(0.5 0.12 340 / 0.4) 60%, transparent 75%)',
  amber: 'radial-gradient(circle at 30% 30%, oklch(0.8 0.16 85), oklch(0.65 0.14 85 / 0.4) 60%, transparent 75%)',
}

function Orb({
  className,
  color,
  opacity,
  drift = false,
  delay = 0,
}: {
  className?: string
  color: keyof typeof COLORS | string
  opacity: number
  drift?: boolean
  delay?: number
}) {
  return (
    <motion.div
      className={className}
      style={{
        background: COLORS[color] ?? COLORS.emerald,
        opacity,
        filter: 'blur(80px)',
        borderRadius: '9999px',
      }}
      animate={
        drift
          ? {
              x: [0, 40, -30, 0],
              y: [0, -30, 20, 0],
              scale: [1, 1.08, 0.96, 1],
            }
          : undefined
      }
      transition={{
        duration: 24,
        repeat: Infinity,
        ease: 'easeInOut',
        delay,
      }}
    />
  )
}
