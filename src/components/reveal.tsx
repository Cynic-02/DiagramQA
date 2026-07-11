'use client'

import * as React from 'react'
import { motion, useReducedMotion, type Variants } from 'framer-motion'

/**
 * Scroll-reveal choreography utilities.
 *
 * - `RevealOnScroll` — fades + slides a single block in when it enters the viewport.
 * - `StaggerContainer` + `StaggerItem` — staggered reveal for lists/grids.
 *
 * All respect prefers-reduced-motion (instant, no transform).
 */

const EASE = [0.22, 1, 0.36, 1] as const

interface RevealProps {
  children: React.ReactNode
  /** direction the content travels in from */
  direction?: 'up' | 'down' | 'left' | 'right' | 'none'
  delay?: number
  duration?: number
  /** viewport amount that must be visible before triggering (0–1) */
  amount?: number
  className?: string
  as?: keyof typeof motion
}

export function RevealOnScroll({
  children,
  direction = 'up',
  delay = 0,
  duration = 0.5,
  amount = 0.2,
  className,
}: RevealProps) {
  const reduce = useReducedMotion()

  const offset =
    direction === 'up'
      ? { y: 24 }
      : direction === 'down'
      ? { y: -24 }
      : direction === 'left'
      ? { x: 24 }
      : direction === 'right'
      ? { x: -24 }
      : {}

  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, ...offset }}
      whileInView={reduce ? { opacity: 1 } : { opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}

const containerVariants: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: EASE },
  },
}

export function StaggerContainer({
  children,
  className,
  amount = 0.15,
}: {
  children: React.ReactNode
  className?: string
  amount?: number
}) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={className}>{children}</div>
  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount }}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={className}>{children}</div>
  return (
    <motion.div className={className} variants={itemVariants}>
      {children}
    </motion.div>
  )
}
