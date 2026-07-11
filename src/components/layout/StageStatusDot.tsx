'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { Check, X, AlertTriangle } from 'lucide-react'
import type { StageStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

interface StageStatusDotProps {
  status: StageStatus
  size?: 'sm' | 'md'
  className?: string
}

const DIMS = {
  sm: { box: 'size-3', icon: 'size-2', pip: 'size-1' },
  md: { box: 'size-4', icon: 'size-2.5', pip: 'size-1.5' },
} as const

/**
 * Reusable, presentational status indicator used in the sidebar stage rows
 * and anywhere a stage status needs to be shown. Pure visual — no store reads.
 *
 * - idle     → hollow bordered box
 * - running  → pulsing accent ring + tiny spinner ring
 * - done     → solid accent check
 * - flagged  → primary triangle, subtle pulse
 * - error    → destructive X
 */
export function StageStatusDot({ status, size = 'md', className }: StageStatusDotProps) {
  const d = DIMS[size]
  const reduce = useReducedMotion()

  if (status === 'done') {
    return (
      <span
        className={cn(
          'flex items-center justify-center border border-emerald-500/30 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full',
          d.box,
          className,
        )}
      >
        <Check className={d.icon} strokeWidth={3} />
      </span>
    )
  }

  if (status === 'error') {
    return (
      <span
        className={cn(
          'flex items-center justify-center border border-red-500/30 bg-red-500/20 text-red-600 dark:text-red-400 rounded-full',
          d.box,
          className,
        )}
      >
        <X className={d.icon} strokeWidth={3} />
      </span>
    )
  }

  if (status === 'flagged') {
    return (
      <motion.span
        className={cn(
          'flex items-center justify-center border border-amber-500/30 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-full',
          d.box,
          className,
        )}
        animate={reduce ? undefined : { opacity: [1, 0.55, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <AlertTriangle className={d.icon} strokeWidth={2.5} />
      </motion.span>
    )
  }

  if (status === 'running') {
    return (
      <span className={cn('relative inline-flex items-center justify-center', d.box, className)}>
        {/* Outer pulsing ring */}
        <motion.span
          aria-hidden
          className="absolute inset-0 border border-accent rounded-full"
          animate={reduce ? undefined : { scale: [1, 1.9], opacity: [0.7, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
        />
        {/* Spinning ring */}
        <motion.span
          aria-hidden
          className="absolute inset-0 border border-border/40 border-t-accent rounded-full"
          animate={reduce ? undefined : { rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        />
        {/* Center pip */}
        <span className={cn('bg-accent rounded-full', d.pip)} />
      </span>
    )
  }

  // idle
  return (
    <span
      className={cn(
        'border border-border/70 bg-transparent rounded-full',
        d.box,
        className,
      )}
    />
  )
}
