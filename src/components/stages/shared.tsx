'use client'

/**
 * Shared small UI helpers used by every stage content component.
 *
 * Exports:
 *   - StageHeader({ stageId })
 *   - EmptyState({ title, hint, icon })
 *   - RunningShimmer({ label })
 *   - StageFrame({ stageId, children })
 *   - DataChip({ children, tone })
 *   - KV({ k, v })
 *   - StatusPill({ status })   (small bonus helper for inline status badges)
 */

import * as React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Loader2, type LucideIcon } from 'lucide-react'
import { STAGES, type StageId, type StageStatus } from '@/lib/types'
import { usePipelineStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { StageStatusDot } from '@/components/layout/StageStatusDot'
import { ShaderIcon } from '@/components/shader-icons'
import DecryptedText from '@/components/reactbits/DecryptedText'

const STATUS_LABEL: Record<StageStatus, string> = {
  idle: 'Idle',
  running: 'Running',
  done: 'Complete',
  flagged: 'Flagged',
  error: 'Error',
}

/* ------------------------------------------------------------------ */
/* StageHeader                                                        */
/* ------------------------------------------------------------------ */

export function StageHeader({ stageId }: { stageId: StageId }) {
  const stage = STAGES.find((s) => s.id === stageId) ?? STAGES[0]
  const stageState = usePipelineStore((s) => s.stages[stageId])

  return (
    <header className="space-y-2">
      <div className="flex flex-col gap-3 md:flex-row md:items-baseline md:justify-between md:gap-6">
        <div className="min-w-0 space-y-1">
          <div className="lbl text-[var(--ink-2)]">
            Stage · {stage.short}
          </div>
          <h1 className="font-[family-name:var(--font-archivo)] text-xl font-black uppercase tracking-[-0.03em] md:text-2xl">
            <DecryptedText
              text={stage.label}
              animateOn="view"
              speed={30}
              maxIterations={8}
              sequential={true}
              useOriginalCharsOnly={false}
              className="text-foreground font-black"
              parentClassName="text-foreground font-black"
            />
          </h1>
          <p className="max-w-3xl text-[12px] leading-snug text-[var(--ink-2)]">
            <span className="font-bold text-[var(--ink)]">{stage.agent}</span>
            <span className="mx-1.5">·</span>
            {stage.description}
          </p>
        </div>
        {/* Removed status badge per user request */}
      </div>

      {stageState.message && (
        <div className="flex items-center gap-2 font-mono text-[11px] text-[var(--ink-2)]">
          {stageState.status === 'running' && (
            <Loader2 className="size-3 animate-spin text-[var(--ink)]" />
          )}
          <span className="truncate">{stageState.message}</span>
        </div>
      )}
    </header>
  )
}

/* ------------------------------------------------------------------ */
/* EmptyState                                                         */
/* ------------------------------------------------------------------ */

export function EmptyState({
  title,
  hint,
  icon: Icon,
}: {
  title: string
  hint?: string
  icon?: LucideIcon
}) {
  return (
    /* Sized to its own content, centred in whatever space it is given.
       The previous version carried `min-h-[340px]` and `py-24`, so an
       empty stage rendered a dashed box the height of the viewport —
       the page shouted loudest at the exact moment it had least to
       say. */
    <div className="flex flex-1 items-center justify-center px-6 py-10">
      <div className="ticket flex max-w-[480px] flex-col items-center gap-3 px-8 py-7 text-center">
        {Icon && (
          <div className="flex size-11 items-center justify-center rounded-[var(--r-s)] border-2 border-[var(--line)] bg-[var(--yellow)]">
            <ShaderIcon icon={Icon} size={20} colorTint="#0a0a0a" speed={0.35} />
          </div>
        )}
        <div className="space-y-1.5">
          <p className="font-[family-name:var(--font-archivo)] text-[15px] font-black uppercase tracking-[-0.01em]">
            {title}
          </p>
          {hint && (
            <p className="mx-auto max-w-[46ch] text-[11.5px] leading-relaxed text-[var(--ink-2)]">
              {hint}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* RunningShimmer                                                     */
/* ------------------------------------------------------------------ */

export function RunningShimmer({ label }: { label: string }) {
  const reduce = useReducedMotion()
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5 text-sm font-bold text-foreground">
        <Loader2 className="size-4 animate-spin" />
        <span>{label}</span>
      </div>
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="relative h-20 overflow-hidden rounded-[var(--r)] border-[1.5px] border-[var(--line)]/30 bg-[var(--card)]"
          >
            <motion.div
              aria-hidden
              className="absolute inset-0 bg-muted"
              initial={reduce ? false : { opacity: 0.3 }}
              animate={reduce ? undefined : { opacity: [0.3, 1, 0.3] }}
              transition={{
                duration: 1.1,
                repeat: Infinity,
                delay: i * 0.18,
                ease: 'easeInOut',
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* StageFrame                                                         */
/* ------------------------------------------------------------------ */

export function StageFrame({
  stageId,
  children,
  showHeader = true,
}: {
  stageId: StageId
  children: React.ReactNode
  /**
   * Set false when the stage renders its own header inside a column.
   */
  showHeader?: boolean
}) {
  const reduce = useReducedMotion()
  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      /* The shell hands every stage a fixed-height box and never scrolls
         the document. A stage is therefore a column: chrome pinned, one
         scrolling pane. Anything that overflows scrolls *inside* the
         frame, so the rail, top bar and dock stay put. */
      className="flex h-full min-h-0 flex-col"
    >
      {showHeader && (
        <div className="shrink-0 border-b-2 border-[var(--line)] bg-[var(--card)] px-5 py-3.5 md:px-8">
          <StageHeader stageId={stageId} />
        </div>
      )}
      <div className="scroll-slim min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-8">
        <div className="mx-auto w-full max-w-[1500px]">{children}</div>
      </div>
    </motion.section>
  )
}

/* ------------------------------------------------------------------ */
/* DataChip                                                           */
/* ------------------------------------------------------------------ */

export type DataChipTone = 'default' | 'emerald' | 'amber' | 'coral' | 'teal'

const CHIP_TONES: Record<DataChipTone, string> = {
  default: 'border-border/60 bg-muted/65 text-foreground',
  emerald: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  amber: 'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  coral: 'border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400',
  teal: 'border-teal-500/20 bg-teal-500/10 text-teal-600 dark:text-teal-400',
}

export function DataChip({
  children,
  tone = 'default',
  className,
}: {
  children: React.ReactNode
  tone?: DataChipTone
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold leading-none',
        CHIP_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* KV (key/value row)                                                 */
/* ------------------------------------------------------------------ */

export function KV({ k, v }: { k: React.ReactNode; v: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{k}</dt>
      <dd className="truncate text-right text-sm font-bold text-foreground">{v}</dd>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* StatusPill — small inline pill for status words                    */
/* ------------------------------------------------------------------ */

export function StatusPill({ status }: { status: StageStatus }) {
  const tones: Record<StageStatus, string> = {
    idle: 'border-border bg-muted/65 text-foreground',
    running: 'border-accent/30 bg-accent/15 text-accent animate-pulse',
    done: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    flagged: 'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400',
    error: 'border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold leading-none',
        tones[status],
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}
