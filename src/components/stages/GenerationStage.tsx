'use client'

/**
 * GenerationStage — Generator agent output.
 *
 * Reads `questions` (GeneratedQuestion[]) and `stages.generation.status`.
 *
 * - idle + empty → EmptyState
 * - running + empty → RunningShimmer
 * - has data → list of question cards, staggered fade-up. Each card shows
 *   the question text, a bloom-level pill (colored by hue), the cognitive
 *   skill, and the entity `targets` as DataChips. Numbered Q1, Q2…
 *   Count header at the top; shimmer skeleton at the bottom while running.
 */

import { motion, useReducedMotion } from 'framer-motion'
import { Loader2, Sparkles } from 'lucide-react'
import { usePipelineStore } from '@/lib/store'
import { BLOOM_META } from '@/lib/bloom'
import type { GeneratedQuestion } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StageFrame, EmptyState, DataChip } from './shared'
import { AgentThinkingConsole } from './AgentThinkingConsole'
import { CountUpText } from '@/hooks/use-count-up'
import BorderGlow from '@/components/reactbits/BorderGlow'

export function GenerationStage() {
  const questions = usePipelineStore((s) => s.questions)
  const status = usePipelineStore((s) => s.stages.generation.status)
  const bloomLevel = usePipelineStore((s) => s.bloomLevel)

  return (
    <StageFrame stageId="generation">
      {questions.length === 0 && status === 'idle' && (
        <EmptyState
          title="No questions yet"
          hint="The generator agent composes Bloom's-conditioned questions once extraction completes."
          icon={Sparkles}
        />
      )}

      {questions.length === 0 && status === 'running' && (
        <AgentThinkingConsole
          stageId="generation"
          label={`Generator agent composing questions at ${bloomLevel} level…`}
        />
      )}

      {questions.length === 0 && status === 'error' && (
        <EmptyState
          title="Generation failed"
          hint="The generator agent could not produce questions for this diagram."
          icon={Sparkles}
        />
      )}

      {questions.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold uppercase">
              <CountUpText value={questions.length} duration={700} />{' '}
              {questions.length === 1 ? 'question' : 'questions'} generated
              <span className="ml-2 font-normal normal-case text-muted-foreground">
                at <span className="font-bold text-secondary">{bloomLevel}</span> level
              </span>
            </h3>
            {status === 'running' && (
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                <Loader2 className="size-3 animate-spin text-foreground" />
                composing…
              </div>
            )}
          </div>

          <div className="space-y-3">
            {questions.map((q, i) => (
              <QuestionCard key={q.id} q={q} index={i} />
            ))}

            {status === 'running' && (
              <div className="space-y-2">
                <Skeleton className="h-20 w-full rounded-[var(--radius)]" />
                <Skeleton className="h-20 w-full rounded-[var(--radius)]" />
              </div>
            )}
          </div>
        </div>
      )}
    </StageFrame>
  )
}

/* ------------------------------------------------------------------ */

function QuestionCard({ q, index }: { q: GeneratedQuestion; index: number }) {
  const reduce = useReducedMotion()
  const meta = BLOOM_META[q.bloomLevel]

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
    >
      <BorderGlow borderRadius={6} glowRadius={26} edgeSensitivity={35} glowIntensity={0.8} coneSpread={30}>
        <Card className="p-5">
          <div className="flex items-start gap-4">
            <div className="flex size-9 shrink-0 items-center justify-center border border-primary/30 bg-primary/10 font-mono text-xs font-black text-primary rounded-full shadow-sm">
              Q{index + 1}
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <p className="text-[15px] font-bold leading-snug">{q.text}</p>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="inline-flex items-center border border-border/70 rounded-full px-2.5 py-0.5 text-[11px] font-bold leading-none"
                  style={{ backgroundColor: `color-mix(in srgb, ${meta.hue} 15%, transparent)`, borderColor: meta.hue, color: 'var(--foreground)' }}
                >
                  {q.bloomLevel}
                </span>
                <DataChip>{q.cognitiveSkill}</DataChip>
                {q.targets.length > 0 && (
                  <span className="flex flex-wrap items-center gap-1">
                    <span className="text-[11px] font-bold text-muted-foreground">targets:</span>
                    {q.targets.map((t) => (
                      <DataChip key={t}>{t}</DataChip>
                    ))}
                  </span>
                )}
              </div>
            </div>
          </div>
        </Card>
      </BorderGlow>
    </motion.div>
  )
}
