'use client'

import { usePipelineStore } from '@/lib/store'
import { usePipelineStream } from '@/hooks/use-pipeline-stream'
import { AppShell } from '@/components/layout/AppShell'
import { UploadStage } from '@/components/stages/UploadStage'
import { ExtractionStage } from '@/components/stages/ExtractionStage'
import { GenerationStage } from '@/components/stages/GenerationStage'
import { AnsweringStage } from '@/components/stages/AnsweringStage'
import { VerificationStage } from '@/components/stages/VerificationStage'
import { ResultsStage } from '@/components/stages/ResultsStage'
import { PipelineThinkingFeed } from '@/components/stages/PipelineThinkingFeed'
import { StageTransition } from '@/components/stage-transition'
import { CommandPalette } from '@/components/command-palette'

/** The five working agents — while the run is actively moving through
 *  these, they all render on one shared page (see PipelineThinkingFeed)
 *  instead of each getting its own full-page swap. */
const WORKING_STAGES = new Set(['extraction', 'generation', 'answering', 'verification', 'results'])

function renderActiveStage(activeStage: string, running: boolean) {
  if (running && WORKING_STAGES.has(activeStage)) {
    return <PipelineThinkingFeed />
  }
  switch (activeStage) {
    case 'upload':
      return <UploadStage />
    case 'extraction':
      return <ExtractionStage />
    case 'generation':
      return <GenerationStage />
    case 'answering':
      return <AnsweringStage />
    case 'verification':
      return <VerificationStage />
    case 'results':
      return <ResultsStage />
    default:
      return <UploadStage />
  }
}

/**
 * The console.
 *
 * The page no longer scrolls and nothing floats over it: the shell is
 * locked to the viewport, the agent log and the follow-up chat live in
 * the right dock, and the footer is a one-line status strip rather than
 * a block of content you had to scroll past.
 */
export default function AppPage() {
  usePipelineStream()
  const activeStage = usePipelineStore((s) => s.activeStage)
  const running = usePipelineStore((s) => s.running)
  const showingFeed = running && WORKING_STAGES.has(activeStage)

  // While the run is moving through the working agents, `activeStage`
  // itself flips every few seconds (extraction → generation → …) as each
  // one starts. Keying StageTransition on that would remount — and
  // restart the entrance animation of — the shared feed on every single
  // agent handoff, which is exactly the "jumping to a new page" feeling
  // this was meant to fix. Give the whole run a single stable key instead;
  // only the transition into and out of the feed as a whole still animates.
  const transitionKey = showingFeed ? 'pipeline-feed' : activeStage

  return (
    <>
      <CommandPalette />
      <AppShell footer={<StatusStrip />}>
        <StageTransition stageId={transitionKey}>
          {renderActiveStage(activeStage, running)}
        </StageTransition>
      </AppShell>
    </>
  )
}

function StatusStrip() {
  const running = usePipelineStore((s) => s.running)
  const completed = usePipelineStore((s) => s.completed)

  const marks = [
    { label: 'Extraction', color: 'var(--bloom-1)' },
    { label: 'Generation', color: 'var(--bloom-3)' },
    { label: 'Answering', color: 'var(--bloom-2)' },
    { label: 'Verification', color: 'var(--bloom-5)' },
  ]

  return (
    <footer className="flex h-8 shrink-0 items-center gap-4 border-t-2 border-[var(--line)] bg-[var(--card)] px-4 md:px-6">
      {/* The wordmark keeps its own casing. `uppercase` flattened the
          two capitals that give the name its shape, so it rendered as
          DIAGRAMMIND — one unbroken run of letters. */}
      <span className="dat shrink-0 text-[11px] font-bold tracking-[0.02em] text-[var(--ink)]">
        DiagramMind
      </span>
      <span className="hidden truncate font-mono text-[10px] text-[var(--ink-2)] md:inline">
        Agentic, Retrieval-Augmented, Diagram-Driven Course Question Generation
      </span>
      <div className="ml-auto flex shrink-0 items-center gap-3">
        {marks.map((m) => (
          <span
            key={m.label}
            className="hidden items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--ink-2)] xl:flex"
          >
            <span
              className="size-1.5 rounded-full"
              style={{ backgroundColor: m.color }}
              aria-hidden
            />
            {m.label}
          </span>
        ))}
        <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--ink-2)]">
          <span
            className={`size-1.5 rounded-full ${
              running ? 'bg-[var(--red)]' : completed ? 'bg-[var(--bloom-2)]' : 'bg-[var(--ink-2)]'
            }`}
            aria-hidden
          />
          {running ? 'running' : completed ? 'complete' : 'idle'}
        </span>
      </div>
    </footer>
  )
}
