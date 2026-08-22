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

/** The confidence hue, used for the card's spine, its question tint and
 *  its meter — one colour saying one thing in three places. */
const TONE_HUE: Record<ConfidenceTone, string> = {
  emerald: 'var(--bloom-3)',
  amber: 'var(--bloom-4)',
  coral: 'var(--red)',
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
          <div className="flex items-start gap-2.5 rounded-[var(--r-s)] border-[1.5px] border-[var(--yellow)] bg-[color-mix(in_srgb,var(--yellow)_16%,transparent)] px-4 py-2.5 text-[11.5px] font-semibold leading-snug">
            <EyeOff className="mt-0.5 size-3.5 shrink-0 text-accent-foreground" />
            <span>
              The solver has no access to the generator&apos;s intent — every
              answer is derived from the diagram only. This is what makes the
              verification loop meaningful.
            </span>
          </div>

          {/* Same grid as Results and Review. These are the same objects
              — a question with an answer attached — so they get the same
              shape, and a run stops changing layout depending on which
              stage you happen to be looking at. */}
          <div className="grid gap-5 xl:grid-cols-2 min-[2000px]:grid-cols-3">
            {pairs.map(({ a, q }, i) =>
              q ? <AnswerCard key={a.questionId} a={a} q={q} index={i} /> : null,
            )}

            {status === 'running' && (
              <Skeleton className="h-40 w-full rounded-[var(--r)]" />
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
    /* THREE ZONES, THREE GROUNDS.
       Question, answer, and verdict were three stacked blocks separated
       by nothing but margin, so a card read as one undifferentiated
       column of text and you had to start reading to find out which part
       you were in. Each zone now sits on its own surface — a tinted
       header strip for the question, graph paper for the answer, card
       for the meter and controls — so the structure is legible before a
       single word is. The tint is the confidence hue, which means the
       card also tells you how it did from across the room. */
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      className="lift glass-surface flex h-full flex-col overflow-hidden border-2 border-[var(--line)] shadow-[2px_2px_0_var(--line)]"
      style={{ '--sh': '2px' } as React.CSSProperties}
    >
      <span className="h-[5px] shrink-0 rounded-none" style={{ background: TONE_HUE[tone] }} aria-hidden />

      {/* ---- zone 1 · the question ---- */}
      <div
        className="flex shrink-0 items-start gap-2.5 border-b-2 border-[var(--line)]/12 px-4 py-3"
        style={{ background: `color-mix(in srgb, ${TONE_HUE[tone]} 11%, transparent)` }}
      >
        <span
          className="shrink-0 font-[family-name:var(--font-archivo)] text-[17px] font-black leading-none text-transparent"
          style={{ WebkitTextStroke: '1.5px var(--ink)', paintOrder: 'stroke fill' }}
          aria-hidden
        >
          Q
        </span>
        <p className="min-w-0 flex-1 text-[13px] font-bold leading-snug">{q.text}</p>
      </div>

      {/* ---- zone 2 · the answer ---- */}
      <div className="glass-inner flex flex-1 flex-col gap-2 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <span className="fig-label">Answer</span>
          <DataChip tone="emerald">
            <ShieldCheck className="size-2.5" />
            Answered independently
          </DataChip>
        </div>
        <p className="text-[13.5px] leading-relaxed">{a.answer}</p>
      </div>

      {/* ---- zone 3 · the verdict ---- */}
      <div className="mt-auto shrink-0 space-y-2 border-t-2 border-[var(--line)]/12 bg-[color-mix(in_srgb,var(--card)_45%,transparent)] px-4 py-2.5">
        <div className="flex items-center justify-between font-mono text-[9.5px] font-bold uppercase tracking-[0.12em] text-[var(--ink-2)]">
          <span>Confidence</span>
          <span className="text-[var(--ink)]">{(conf * 100).toFixed(0)}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full border-[1.5px] border-[var(--line)]">
          <motion.div
            className="h-full rounded-none"
            style={{ background: TONE_HUE[tone] }}
            initial={reduce ? false : { width: 0 }}
            animate={{ width: `${conf * 100}%` }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          />
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
              <div className="mt-1.5 rounded-[var(--r-s)] border-[1.5px] border-dashed border-[var(--line)]/25 px-3.5 py-2.5 text-[11.5px] leading-relaxed text-[var(--ink-2)]">
                {a.reasoning}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </motion.article>
  )
}
