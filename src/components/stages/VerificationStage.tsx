'use client'

/**
 * VerificationStage — Critic agent output.
 *
 * Reads `verification`, `questions`, `stages.verification.status`.
 *
 * - Top summary: X passed / Y flagged / Z rejected (StatBox row).
 * - Each verdict row (matched to question): status badge (pass/flagged/reject),
 *   question text, correctness badge, chips for ambiguity/leakRisk/difficulty,
 *   issues list, optional suggestion quote block. "Will be regenerated" hint
 *   for rejected items.
 * - Newly-arrived verdicts animate in (staggered fade-up).
 */

import { motion, useReducedMotion } from 'framer-motion'
import {
  Check,
  X,
  AlertTriangle,
  ShieldCheck,
  Loader2,
  RotateCcw,
  type LucideIcon,
} from 'lucide-react'
import { usePipelineStore } from '@/lib/store'
import type { VerificationVerdict, GeneratedQuestion } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StageFrame, EmptyState, DataChip } from './shared'
import { AgentThinkingConsole } from './AgentThinkingConsole'

type Tone = 'emerald' | 'amber' | 'coral'

const TONE_BG: Record<Tone, string> = {
  emerald: 'bg-accent',
  amber: 'bg-primary',
  coral: 'bg-destructive',
}

function statusTone(s: VerificationVerdict['status']): Tone {
  if (s === 'pass') return 'emerald'
  if (s === 'flagged') return 'amber'
  return 'coral'
}

function correctnessTone(c: VerificationVerdict['correctness']): Tone {
  if (c === 'correct') return 'emerald'
  if (c === 'partial') return 'amber'
  return 'coral'
}

export function VerificationStage() {
  const verdicts = usePipelineStore((s) => s.verification)
  const questions = usePipelineStore((s) => s.questions)
  const status = usePipelineStore((s) => s.stages.verification.status)

  if (verdicts.length === 0 && status === 'idle') {
    return (
      <StageFrame stageId="verification">
        <EmptyState
          title="No verdicts yet"
          hint="The critic agent verifies each Q&A pair for correctness, ambiguity and label accuracy once the solver finishes."
          icon={ShieldCheck}
        />
      </StageFrame>
    )
  }

  if (verdicts.length === 0 && status === 'running') {
    return (
      <StageFrame stageId="verification">
        <AgentThinkingConsole stageId="verification" label="Critic agent verifying Q&A pairs…" />
      </StageFrame>
    )
  }

  if (verdicts.length === 0 && status === 'error') {
    return (
      <StageFrame stageId="verification">
        <EmptyState
          title="Verification failed"
          hint="The critic agent could not verify the Q&A pairs."
          icon={ShieldCheck}
        />
      </StageFrame>
    )
  }

  const passed = verdicts.filter((v) => v.status === 'pass').length
  const flagged = verdicts.filter((v) => v.status === 'flagged').length
  const rejected = verdicts.filter((v) => v.status === 'reject').length

  return (
    <StageFrame stageId="verification">
      <div className="space-y-4">
        {/* Summary row */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <StatBox
            label="Passed"
            value={passed}
            tone="emerald"
            icon={<Check className="size-3.5" />}
          />
          <StatBox
            label="Flagged"
            value={flagged}
            tone="amber"
            icon={<AlertTriangle className="size-3.5" />}
          />
          <StatBox
            label="Rejected"
            value={rejected}
            tone="coral"
            icon={<X className="size-3.5" />}
          />
        </div>

        <div className="space-y-3">
          {verdicts.map((v, i) => {
            const q = questions.find((q) => q.id === v.questionId)
            return <VerdictRow key={v.questionId} v={v} q={q} index={i} />
          })}

          {status === 'running' && (
            <Skeleton className="h-16 w-full rounded-[var(--radius)]" />
          )}
        </div>

        {status === 'running' && (
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
            <Loader2 className="size-3 animate-spin text-foreground" />
            <span>Critic still reviewing…</span>
          </div>
        )}
      </div>
    </StageFrame>
  )
}

/* ------------------------------------------------------------------ */

function StatBox({
  label,
  value,
  tone,
  icon,
}: {
  label: string
  value: number
  tone: Tone
  icon: React.ReactNode
}) {
  const toneCls = {
    emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    amber: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
    coral: 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400',
  }[tone]
  return (
    <div className={cn('flex items-center gap-3 border rounded-[var(--radius)] px-4 py-3 font-bold shadow-sm', toneCls)}>
      <span className="flex size-8 items-center justify-center rounded-full border border-current/25 bg-current/5">
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-xl font-black leading-none">{value}</div>
        <div className="mt-0.5 text-[11px] font-bold uppercase tracking-wide opacity-90">{label}</div>
      </div>
    </div>
  )
}

function VerdictRow({
  v,
  q,
  index,
}: {
  v: VerificationVerdict
  q: GeneratedQuestion | undefined
  index: number
}) {
  const reduce = useReducedMotion()
  const tone = statusTone(v.status)
  const Icon: LucideIcon =
    v.status === 'pass' ? Check : v.status === 'flagged' ? AlertTriangle : X
  const cTone = correctnessTone(v.correctness)

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'flex size-8 shrink-0 items-center justify-center border rounded-full',
              {
                emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                amber: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
                coral: 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400',
              }[tone],
            )}
          >
            <Icon className="size-3.5" strokeWidth={3} />
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            {/* Question text */}
            <p className="line-clamp-2 text-sm font-bold leading-snug">
              {q ? q.text : v.questionId}
            </p>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <DataChip tone={cTone}>{v.correctness}</DataChip>
              {v.ambiguity && <DataChip tone="amber">ambiguous</DataChip>}
              {v.leakRisk && <DataChip tone="coral">leak risk</DataChip>}
              {!v.difficultyAccurate && (
                <DataChip tone="amber">difficulty mismatch</DataChip>
              )}
            </div>

            {/* Issues */}
            {v.issues.length > 0 && (
              <ul className="space-y-0.5 text-xs font-medium text-muted-foreground">
                {v.issues.map((issue, i) => (
                  <li key={i} className="leading-relaxed">
                    · {issue}
                  </li>
                ))}
              </ul>
            )}

            {/* Suggestion */}
            {v.suggestion && (
              <blockquote className="border-l-2 border-border bg-muted/65 px-3 py-2 text-xs font-medium italic leading-relaxed text-muted-foreground rounded-r">
                {v.suggestion}
              </blockquote>
            )}

            {/* Regenerate hint */}
            {v.status === 'reject' && (
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-foreground">
                <RotateCcw className="size-3" />
                <span>Will be regenerated by the generator agent</span>
              </div>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
