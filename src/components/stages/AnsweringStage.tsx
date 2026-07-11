'use client'

/**
 * AnsweringStage — Solver agent output.
 *
 * Reads `answers`, `questions`, `stages.answering.status`.
 *
 * The solver answers each question INDEPENDENTLY from the diagram alone,
 * without seeing the generator's intent — reinforced by a top banner and a
 * per-card "Answered independently" badge.
 *
 * Each paired card: question (muted, smaller) on top; answer (primary,
 * larger) below with reasoning in a collapsible; a confidence meter colored
 * by confidence (emerald ≥0.75, amber ≥0.5, coral otherwise).
 */

import * as React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Loader2,
  MessageSquareQuote,
  EyeOff,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react'
import { usePipelineStore } from '@/lib/store'
import type { GeneratedAnswer, GeneratedQuestion } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'
import { StageFrame, EmptyState, DataChip } from './shared'
import { AgentThinkingConsole } from './AgentThinkingConsole'

type ConfidenceTone = 'emerald' | 'amber' | 'coral'

function confTone(c: number): ConfidenceTone {
  if (c >= 0.75) return 'emerald'
  if (c >= 0.5) return 'amber'
  return 'coral'
}

const CONF_BAR: Record<ConfidenceTone, string> = {
  emerald: 'bg-accent',
  amber: 'bg-primary',
  coral: 'bg-destructive',
}

export function AnsweringStage() {
  const answers = usePipelineStore((s) => s.answers)
  const questions = usePipelineStore((s) => s.questions)
  const status = usePipelineStore((s) => s.stages.answering.status)

  const pairs = answers.map((a) => ({
    a,
    q: questions.find((q) => q.id === a.questionId),
  }))

  return (
    <StageFrame stageId="answering">
      {answers.length === 0 && status === 'idle' && (
        <EmptyState
          title="No answers yet"
          hint="The solver agent answers each question independently from the diagram alone — no peeking at the generator's intent."
          icon={MessageSquareQuote}
        />
      )}

      {answers.length === 0 && status === 'running' && (
        <AgentThinkingConsole stageId="answering" label="Solver agent answering independently from the diagram…" />
      )}

      {answers.length === 0 && status === 'error' && (
        <EmptyState
          title="Answering failed"
          hint="The solver agent could not produce answers."
          icon={MessageSquareQuote}
        />
      )}

      {answers.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-start gap-2.5 border border-accent/30 bg-accent/10 px-4 py-3 text-xs font-semibold text-foreground rounded-lg shadow-sm">
            <EyeOff className="mt-0.5 size-3.5 shrink-0 text-accent-foreground" />
            <span>
              The solver has no access to the generator&apos;s intent — every
              answer is derived from the diagram only. This is what makes the
              verification loop meaningful.
            </span>
          </div>

          <div className="space-y-3">
            {pairs.map(({ a, q }, i) =>
              q ? <AnswerCard key={a.questionId} a={a} q={q} index={i} /> : null,
            )}

            {status === 'running' && (
              <div className="space-y-2">
                <Skeleton className="h-24 w-full rounded-[var(--radius)]" />
              </div>
            )}
          </div>

          {status === 'running' && (
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
              <Loader2 className="size-3 animate-spin text-foreground" />
              <span>Solver still working…</span>
            </div>
          )}
        </div>
      )}
    </StageFrame>
  )
}

/* ------------------------------------------------------------------ */

function AnswerCard({
  a,
  q,
  index,
}: {
  a: GeneratedAnswer
  q: GeneratedQuestion
  index: number
}) {
  const reduce = useReducedMotion()
  const conf = Math.max(0, Math.min(1, a.confidence))
  const tone = confTone(conf)
  const [open, setOpen] = React.useState(false)

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card className="p-5">
        <div className="space-y-3">
          {/* Question */}
          <div className="flex items-start gap-2">
            <span className="mt-0.5 font-mono text-[11px] font-bold text-muted-foreground">Q</span>
            <p className="flex-1 text-sm font-medium leading-snug text-muted-foreground">{q.text}</p>
          </div>

          {/* Answer */}
          <div className="border border-border/70 rounded-lg bg-muted/65 px-4 py-3">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-bold text-muted-foreground">A</span>
                <DataChip tone="emerald">
                  <ShieldCheck className="size-2.5" />
                  Answered independently
                </DataChip>
              </div>
              <span className="font-mono text-[11px] font-bold text-muted-foreground">
                {(conf * 100).toFixed(0)}%
              </span>
            </div>
            <p className="text-[15px] font-medium leading-relaxed">{a.answer}</p>
          </div>

          {/* Confidence meter */}
          <div>
            <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-muted-foreground">
              <span>Confidence</span>
              <span>{(conf * 100).toFixed(0)}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden border border-border/70 bg-muted/65 rounded-full">
              <motion.div
                className={cn('h-full', CONF_BAR[tone])}
                initial={reduce ? false : { width: 0 }}
                animate={{ width: `${conf * 100}%` }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>

          {/* Reasoning (collapsible) */}
          {a.reasoning && (
            <Collapsible open={open} onOpenChange={setOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-2 h-7 text-xs text-muted-foreground hover:text-foreground"
                >
                  <ChevronDown
                    className={cn(
                      'size-3.5 transition-transform',
                      open && 'rotate-180',
                    )}
                  />
                  {open ? 'Hide reasoning' : 'Show reasoning'}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 border border-border/70 rounded bg-muted/50 px-3.5 py-2.5 text-xs font-medium leading-relaxed text-muted-foreground">
                  {a.reasoning}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </Card>
    </motion.div>
  )
}
