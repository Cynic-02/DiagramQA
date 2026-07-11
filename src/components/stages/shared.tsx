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
    <header className="space-y-4 border-b border-border/40 pb-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-6">
        <div className="min-w-0 space-y-1.5">
          <div className="text-[11px] font-mono font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Stage · {stage.short}
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tight md:text-[28px]">
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
          <p className="max-w-2xl text-sm font-medium text-muted-foreground">
            <span className="font-bold text-foreground">{stage.agent}</span>
            <span className="mx-1.5 text-muted-foreground">·</span>
            {stage.description}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5 self-start rounded-full border border-border/40 bg-card px-3.5 py-1.5 shadow-sm">
          <StageStatusDot status={stageState.status} size="sm" />
          <span className="text-xs font-bold uppercase">{STATUS_LABEL[stageState.status]}</span>
        </div>
      </div>

      {stageState.message && (
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {stageState.status === 'running' && (
            <Loader2 className="size-3.5 animate-spin text-foreground" />
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
    <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius)] border border-dashed border-border bg-card px-6 py-16 text-center">
      {Icon && (
        <div className="flex size-12 items-center justify-center rounded-lg border border-border/70 bg-muted shadow-sm">
          <ShaderIcon icon={Icon} size={20} colorTint="#94a3b8" speed={0.35} />
        </div>
      )}
      <div className="space-y-1">
        <p className="text-sm font-bold text-foreground">{title}</p>
        {hint && (
          <p className="mx-auto max-w-sm text-xs font-medium leading-relaxed text-muted-foreground">
            {hint}
          </p>
        )}
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
            className="relative h-20 overflow-hidden border border-border/70 rounded-[var(--radius)] bg-card"
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
}: {
  stageId: StageId
  children: React.ReactNode
}) {
  const reduce = useReducedMotion()
  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto w-full max-w-7xl p-6 md:p-8"
    >
      <StageHeader stageId={stageId} />
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        className="mt-6 md:mt-8"
      >
        {children}
      </motion.div>
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
