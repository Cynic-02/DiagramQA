'use client'

import * as React from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'

/**
 * StageTransition — wraps the active stage content and animates a smooth
 * slide+fade+blur transition whenever the stage changes. Uses AnimatePresence
 * with mode="wait" so the outgoing stage exits before the incoming one
 * enters, preventing layout overlap.
 *
 * THE WRAPPER MUST CARRY HEIGHT.
 * ------------------------------
 * This div sits between `<main class="min-h-0 flex-1 overflow-hidden">`
 * and every stage, and each stage is authored as `h-full min-h-0
 * flex-col` — a column that pins its own masthead and scrolls exactly
 * one pane inside itself. With no height on this wrapper, that `h-full`
 * resolved against an auto-height box and measured nothing: the stages
 * stopped being fixed-height columns, their scroll pane stopped
 * scrolling, and everything past the fold was clipped by `main`'s
 * overflow-hidden with no way to reach it.
 *
 * One missing class, three visible bugs: Answering and Question
 * Generation could not be scrolled, and the Results right rail stopped
 * short of the bottom of the page instead of running its full height.
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
        className="h-full min-h-0"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
