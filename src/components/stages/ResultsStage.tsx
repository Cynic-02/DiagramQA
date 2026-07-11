'use client'

/**
 * ResultsStage — the payoff screen.
 *
 * Reads `finalQA`, `extraction`, `completed`, `failed`, `errorMessage`,
 * `stages.results.status`.
 *
 * - failed → error card with Retry
 * - running + no finalQA → RunningShimmer
 * - idle + no finalQA → EmptyState
 * - has data → header (count + bloom + diagram type + Download JSON +
 *   New run); grid of FinalQA cards (left) with sticky MiniGraph + stats
 *   panel (right). Each card has a small score ring, bloom pill, cognitive
 *   skill chip, verification badge.
 */

import * as React from 'react'
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import {
  AlertCircle,
  RotateCcw,
  Download,
  ListChecks,
  Check,
  AlertTriangle,
  Copy,
  CheckCheck,
  MessageCircle,
  Eye,
  EyeOff,
} from 'lucide-react'
import { toast } from 'sonner'
import { usePipelineStore } from '@/lib/store'
import { BLOOM_META } from '@/lib/bloom'
import type { FinalQAItem } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Folder from '@/components/reactbits/Folder'
import BorderGlow from '@/components/reactbits/BorderGlow'
import { StageFrame, EmptyState, DataChip, KV } from './shared'
import { AgentThinkingConsole } from './AgentThinkingConsole'
import { MiniGraph } from './MiniGraph'
import { CountUpText } from '@/hooks/use-count-up'
import {
  ResultsFilterBar,
  applyFilters,
  DEFAULT_FILTERS,
  type FilterState,
} from './ResultsFilterBar'
import { RevealOnScroll } from '@/components/reveal'

export function ResultsStage() {
  const finalQA = usePipelineStore((s) => s.finalQA)
  const extraction = usePipelineStore((s) => s.extraction)
  const completed = usePipelineStore((s) => s.completed)
  const failed = usePipelineStore((s) => s.failed)
  const errorMessage = usePipelineStore((s) => s.errorMessage)
  const setChatOpen = usePipelineStore((s) => s.setChatOpen)
  const [revealAll, setRevealAll] = React.useState(false)
  const { resolvedTheme } = useTheme()
  // Folder needs a literal hex (it computes darker shades internally),
  // so pick the active theme's real accent color rather than an
  // unrelated leftover amber from an earlier design pass.
  const folderColor = resolvedTheme === 'light' ? '#2b59d1' : '#8052ff'
  const status = usePipelineStore((s) => s.stages.results.status)
  const running = usePipelineStore((s) => s.running)
  const bloomLevel = usePipelineStore((s) => s.bloomLevel)
  const resetRun = usePipelineStore((s) => s.resetRun)

  // results filtering / sorting
  const [filters, setFilters] = React.useState<FilterState>(DEFAULT_FILTERS)
  const availableLevels = React.useMemo(
    () =>
      Array.from(new Set(finalQA.map((q) => q.bloomLevel))) as Array<
        FinalQAItem['bloomLevel']
      >,
    [finalQA]
  )
  const filteredQA = React.useMemo(
    () => applyFilters(finalQA, filters),
    [finalQA, filters]
  )

  /* ---- Error state ---- */
  if (failed) {
    return (
      <StageFrame stageId="results">
        <Card className="border-destructive bg-destructive/10 p-6">
          <div className="flex items-start gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center border-2 border-border bg-destructive text-white">
              <AlertCircle className="size-5" />
            </div>
            <div className="flex-1 space-y-2">
              <h2 className="text-lg font-black uppercase">Pipeline failed</h2>
              <p className="text-sm font-medium text-muted-foreground">
                {errorMessage ?? 'An unexpected error occurred during the run.'}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={resetRun}
                className="mt-3"
              >
                <RotateCcw className="size-3.5" />
                Retry
              </Button>
            </div>
          </div>
        </Card>
      </StageFrame>
    )
  }

  /* ---- Empty / running ---- */
  if (finalQA.length === 0) {
    return (
      <StageFrame stageId="results">
        {status === 'running' || (!completed && status === 'idle' && running) ? (
          <AgentThinkingConsole stageId="results" label="Curator agent assembling the verified question set…" />
        ) : (
          <EmptyState
            title="Curating verified questions"
            hint="Final Q&A will appear here once the curator agent finishes assembling the verified set."
            icon={ListChecks}
          />
        )}
      </StageFrame>
    )
  }

  /* ---- Payoff ---- */
  const avgScore =
    finalQA.reduce((acc, q) => acc + q.score, 0) / Math.max(1, finalQA.length)
  const passRate =
    finalQA.filter((q) => q.verification === 'pass').length /
    Math.max(1, finalQA.length)

  const download = () => {
    const payload = {
      schema: 'ar2-ddcqg.finalQA/v1',
      generatedAt: new Date().toISOString(),
      bloomLevel,
      diagramType: extraction?.diagramType ?? null,
      summary: extraction?.summary ?? null,
      questions: finalQA,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ar2-ddcqg-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Downloaded', {
      description: `${finalQA.length} verified Q&A items`,
    })
  }

  return (
    <StageFrame stageId="results">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="size-2.5 border border-border bg-accent" aria-hidden />
              <span className="text-[11px] font-mono font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Verified set
              </span>
              {completed && (
                <DataChip tone="emerald">
                  <Check className="size-2.5" />
                  complete
                </DataChip>
              )}
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tight md:text-[28px]">
              <CountUpText value={finalQA.length} duration={700} /> verified{' '}
              {finalQA.length === 1 ? 'question' : 'questions'}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <DataChip tone="emerald">{bloomLevel}</DataChip>
              {extraction && <DataChip>{extraction.diagramType}</DataChip>}
              <DataChip>
                avg score{' '}
                <CountUpText
                  value={avgScore}
                  duration={900}
                  formatter={(v) => v.toFixed(2)}
                />
              </DataChip>
              <DataChip>
                pass rate{' '}
                <CountUpText
                  value={passRate * 100}
                  duration={900}
                  formatter={(v) => `${Math.round(v)}%`}
                />
              </DataChip>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant={revealAll ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRevealAll((v) => !v)}
            >
              {revealAll ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              {revealAll ? 'Hide answers' : 'See all answers'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setChatOpen(true)}>
              <MessageCircle className="size-3.5" />
              Ask follow-up
            </Button>
            <Button variant="outline" size="sm" onClick={resetRun}>
              <RotateCcw className="size-3.5" />
              New run
            </Button>
            <Button size="sm" onClick={download}>
              <Download className="size-3.5" />
              Download JSON
            </Button>
          </div>
        </div>

        {/* Filter + sort bar */}
        {finalQA.length > 1 && (
          <RevealOnScroll direction="up" amount={0.1}>
            <ResultsFilterBar
              state={filters}
              onChange={setFilters}
              totalCount={finalQA.length}
              filteredCount={filteredQA.length}
              availableLevels={availableLevels}
            />
          </RevealOnScroll>
        )}

        {/* Grid: QA list + sticky MiniGraph/stats */}
        <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredQA.map((qa, i) => (
                <FinalQACard key={qa.id} qa={qa} index={i} revealAll={revealAll} />
              ))}
            </AnimatePresence>

            {filteredQA.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 border border-dashed border-border bg-card px-6 py-12 text-center rounded-[var(--radius)]">
                <p className="text-sm font-bold text-foreground">
                  No questions match these filters
                </p>
                <button
                  type="button"
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                  className="text-xs font-bold text-secondary transition-colors hover:opacity-70"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>

          {extraction && (
            <Card className="sticky top-16 h-fit space-y-4 p-4">
              {/* Folder — click to open, then use the Download JSON button above */}
              <div className="flex flex-col items-center gap-2 border-b border-border/40 pb-4">
                <Folder
                  color={folderColor}
                  size={0.85}
                  items={[
                    <span key="1" className="text-[9px] font-mono text-foreground/40">Q&A</span>,
                    <span key="2" className="text-[9px] font-mono text-foreground/40">.json</span>,
                    <span key="3" className="text-[9px] font-mono text-foreground/40">✓</span>,
                  ]}
                />
                <button
                  type="button"
                  onClick={download}
                  className="mt-1 text-[11px] font-bold text-muted-foreground transition-colors hover:text-foreground"
                >
                  {finalQA.length} verified {finalQA.length === 1 ? 'item' : 'items'} · click to export
                </button>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-bold uppercase">Source graph</h3>
                <MiniGraph extraction={extraction} />
              </div>

              {/* Verification distribution donut */}
              <div className="border-t border-border/40 pt-3">
                <h3 className="mb-2 text-sm font-bold uppercase">Verification</h3>
                <VerificationDonut finalQA={finalQA} />
              </div>

              <dl className="space-y-0.5 border-t border-border/40 pt-3">
                <KV
                  k="Questions"
                  v={<CountUpText value={finalQA.length} duration={700} />}
                />
                <KV
                  k="Avg score"
                  v={
                    <CountUpText
                      value={avgScore}
                      duration={900}
                      formatter={(v) => v.toFixed(2)}
                    />
                  }
                />
                <KV
                  k="Pass rate"
                  v={
                    <CountUpText
                      value={passRate * 100}
                      duration={900}
                      formatter={(v) => `${Math.round(v)}%`}
                    />
                  }
                />
                <KV k="Bloom level" v={bloomLevel} />
                <KV k="Diagram" v={extraction.diagramType} />
                <KV
                  k="Entities"
                  v={
                    <CountUpText
                      value={extraction.entities.length}
                      duration={700}
                    />
                  }
                />
              </dl>
            </Card>
          )}
        </div>
      </div>
    </StageFrame>
  )
}

/* ------------------------------------------------------------------ */

function FinalQACard({
  qa,
  index,
  revealAll,
}: {
  qa: FinalQAItem
  index: number
  revealAll: boolean
}) {
  const reduce = useReducedMotion()
  const meta = BLOOM_META[qa.bloomLevel]
  const pass = qa.verification === 'pass'
  const [copied, setCopied] = React.useState(false)
  const isMcq = qa.questionType === 'mcq' && !!qa.options && qa.options.length > 0
  // MCQ: the student must pick an option before correctness/answer shows.
  const [pickedOption, setPickedOption] = React.useState<number | null>(null)
  // Short-answer: an explicit "Show answer" click reveals it.
  const [answerShown, setAnswerShown] = React.useState(false)
  const attempted = isMcq ? pickedOption !== null : answerShown
  const showAnswer = revealAll || attempted

  const copyQA = async () => {
    const text = `Q${index + 1} (${qa.bloomLevel}): ${qa.question}\n\nA: ${qa.answer}\n\nScore: ${qa.score} · ${pass ? 'verified' : 'flagged'}`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success('Copied to clipboard')
      setTimeout(() => setCopied(false), 1600)
    } catch {
      toast.error('Copy failed')
    }
  }

  return (
    <motion.div
      layout
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.98 }}
      transition={{ duration: 0.3, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
      whileHover={reduce ? undefined : { x: -2, y: -2 }}
    >
      <BorderGlow
        borderRadius={6}
        glowRadius={28}
        edgeSensitivity={35}
        glowIntensity={0.85}
        coneSpread={30}
      >
      <Card className="group p-5 transition-all duration-300 hover:border-primary/45 hover:shadow-md">
        <div className="flex items-start gap-4">
          <ScoreRing score={qa.score} pending={!showAnswer} />

          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 font-mono text-[11px] font-bold text-muted-foreground">
                Q{index + 1}
              </span>
              <p className="flex-1 text-[15px] font-bold leading-snug">{qa.question}</p>
              <button
                type="button"
                onClick={copyQA}
                aria-label="Copy Q&A"
                className="shrink-0 border border-transparent rounded p-1 text-muted-foreground opacity-0 transition-all hover:border-border hover:bg-accent hover:text-accent-foreground focus-visible:opacity-100 group-hover:opacity-100"
              >
                {copied ? (
                  <CheckCheck className="size-3.5 text-foreground" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </button>
            </div>

            {isMcq && (
              <div className="space-y-1.5">
                <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                  {showAnswer ? 'Options' : 'Choose an option'}
                </div>
                <ul className="space-y-1">
                  {qa.options!.map((opt, i) => {
                    const isCorrectOption = i === qa.correctOptionIndex
                    const isPicked = i === pickedOption
                    // Before an attempt: every option looks the same — no
                    // hint at the correct answer. After: correct option is
                    // highlighted, and if the student picked wrong, their
                    // pick is marked too.
                    const style = !showAnswer
                      ? 'border-border/40 bg-transparent text-foreground hover:border-border hover:bg-muted cursor-pointer'
                      : isCorrectOption
                      ? 'border-border bg-accent font-bold text-accent-foreground'
                      : isPicked
                      ? 'border-destructive bg-destructive/10 text-foreground'
                      : 'border-border/40 bg-transparent text-muted-foreground'
                    return (
                      <li key={i}>
                        <button
                          type="button"
                          disabled={showAnswer}
                          onClick={() => setPickedOption(i)}
                          className={cn(
                            'flex w-full items-center gap-2 border-2 px-2.5 py-1.5 text-left text-sm transition-colors',
                            style
                          )}
                        >
                          <span className="font-mono text-[11px] font-bold">
                            {String.fromCharCode(65 + i)}
                          </span>
                          <span className="flex-1">{opt}</span>
                          {showAnswer && isCorrectOption && <Check className="size-3.5 shrink-0" />}
                          {showAnswer && isPicked && !isCorrectOption && (
                            <span className="shrink-0 text-[10px] font-bold uppercase text-destructive">
                              your pick
                            </span>
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            {!isMcq && !showAnswer && (
              <button
                type="button"
                onClick={() => setAnswerShown(true)}
                className="flex w-full items-center justify-center gap-2 border-2 border-dashed border-border bg-transparent px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-muted-foreground transition-colors hover:border-primary hover:bg-muted hover:text-foreground"
              >
                <Eye className="size-3.5" />
                Show answer
              </button>
            )}

            {showAnswer && (
              <div className="border border-border/70 rounded bg-muted/65 px-3 py-2">
                <div className="mb-1 text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                  Answer
                </div>
                <p className="text-sm font-medium leading-relaxed text-foreground">{qa.answer}</p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center border rounded-full px-2.5 py-0.5 text-[11px] font-bold leading-none"
                style={{ backgroundColor: `color-mix(in srgb, ${meta.hue} 15%, transparent)`, borderColor: meta.hue, color: 'var(--foreground)' }}
              >
                {qa.bloomLevel}
              </span>
              <DataChip>{qa.cognitiveSkill}</DataChip>
              {showAnswer && (
                <DataChip tone={pass ? 'emerald' : 'amber'}>
                  {pass ? (
                    <>
                      <Check className="size-2.5" />
                      verified
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="size-2.5" />
                      flagged
                    </>
                  )}
                </DataChip>
              )}
            </div>
          </div>
        </div>
      </Card>
      </BorderGlow>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Verification distribution donut                                     */
/* ------------------------------------------------------------------ */

function VerificationDonut({ finalQA }: { finalQA: FinalQAItem[] }) {
  const reduce = useReducedMotion()
  const passed = finalQA.filter((q) => q.verification === 'pass').length
  const flagged = finalQA.length - passed
  const total = Math.max(1, finalQA.length)
  const passPct = passed / total

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between">
        <span className="text-3xl font-black leading-none">
          {Math.round(passPct * 100)}%
        </span>
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          pass rate
        </span>
      </div>
      <div className="flex h-4 w-full overflow-hidden border border-border/80 rounded-full">
        <motion.div
          className="h-full bg-accent"
          initial={reduce ? false : { width: 0 }}
          animate={{ width: `${passPct * 100}%` }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        />
        <div className="h-full flex-1 bg-primary/20" />
      </div>
      <div className="flex-1 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 font-bold text-muted-foreground">
            <span className="size-2.5 border border-border bg-accent" />
            Passed
          </span>
          <span className="font-mono font-bold text-foreground">{passed}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 font-bold text-muted-foreground">
            <span className="size-2.5 border border-border bg-primary" />
            Flagged
          </span>
          <span className="font-mono font-bold text-foreground">{flagged}</span>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function ScoreRing({ score, pending }: { score: number; pending?: boolean }) {
  const pct = Math.max(0, Math.min(1, score))
  const color = pending
    ? 'var(--muted-foreground)'
    : pct >= 0.8
      ? 'var(--accent)'
      : pct >= 0.5
      ? 'var(--primary)'
      : 'var(--destructive)'
  const border = pending ? 'var(--border)' : color
  const fill = pending ? 'var(--muted)' : `color-mix(in srgb, ${color} 15%, transparent)`

  return (
    <div
      className="flex size-10 shrink-0 items-center justify-center border rounded-full font-black shadow-sm"
      style={{ backgroundColor: fill, borderColor: border, color: pending ? 'var(--muted-foreground)' : color }}
    >
      <span className="text-xs">{pending ? '?' : score.toFixed(1)}</span>
    </div>
  )
}
