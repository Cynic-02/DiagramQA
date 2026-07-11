'use client'

import * as React from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'

/**
 * StageTransition — wraps the active stage content and animates a smooth
 * slide+fade+blur transition whenever the stage changes. Uses AnimatePresence
 * with mode="wait" so the outgoing stage exits before the incoming one
 * enters, preventing layout overlap.
 */
const EASE = [0.22, 1, 0.36, 1] as const

export function StageTransition({
  stageId,
  children,
}: {
  stageId: string
  children: React.ReactNode
}) {
  const reduce = useReducedMotion()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={stageId}
        initial={
          reduce
            ? { opacity: 0 }
            : { opacity: 0, x: 24, filter: 'blur(4px)' }
        }
        animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, x: -24, filter: 'blur(4px)' }}
        transition={{ duration: 0.32, ease: EASE }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
