'use client'

import { useEffect, useRef, useState } from 'react'
import { usePipelineStore } from '@/lib/store'
import { usePipelineStream } from '@/hooks/use-pipeline-stream'
import { AppShell } from '@/components/layout/AppShell'
import { UploadStage } from '@/components/stages/UploadStage'
import { ExtractionStage } from '@/components/stages/ExtractionStage'
import { GenerationStage } from '@/components/stages/GenerationStage'
import { AnsweringStage } from '@/components/stages/AnsweringStage'
import { VerificationStage } from '@/components/stages/VerificationStage'
import { ResultsStage } from '@/components/stages/ResultsStage'
import { ScrollProgress } from '@/components/scroll-progress'
import { StageTransition } from '@/components/stage-transition'
import { CommandPalette } from '@/components/command-palette'
import { CompletionBurst } from '@/components/completion-burst'
import { ChatPanel } from '@/components/chat-panel'

function renderActiveStage(activeStage: string) {
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

export default function AppPage() {
  usePipelineStream()

  const activeStage = usePipelineStore((s) => s.activeStage)
  const completed = usePipelineStore((s) => s.completed)
  const runId = usePipelineStore((s) => s.runId)
  const finalQA = usePipelineStore((s) => s.finalQA)
  const chatOpen = usePipelineStore((s) => s.chatOpen)
  const setChatOpen = usePipelineStore((s) => s.setChatOpen)

  const burstFiredRef = useRef(false)
  const [burst, setBurst] = useState(false)

  useEffect(() => {
    if (!completed || burstFiredRef.current) return
    burstFiredRef.current = true
    const on = setTimeout(() => setBurst(true), 0)
    const off = setTimeout(() => setBurst(false), 2200)
    return () => {
      clearTimeout(on)
      clearTimeout(off)
    }
  }, [completed])

  return (
    <div className="relative flex min-h-screen flex-col grid-faint-lighter">
      <ScrollProgress />
      <CommandPalette />
      <CompletionBurst trigger={burst} />

      <AppShell>
        <StageTransition stageId={activeStage}>
          {renderActiveStage(activeStage)}
        </StageTransition>
      </AppShell>

      {/* Chat button — appears once results are generated */}
      {completed && finalQA.length > 0 && (
        <ChatPanel
          runId={runId}
          open={chatOpen}
          onOpenChange={setChatOpen}
        />
      )}

      <Footer />
    </div>
  )
}

function Footer() {
  return (
    <footer className="mt-auto border-t border-border/40 bg-background">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-6 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold tracking-widest text-foreground/80">
            AR2-DDCQG
          </span>
          <span className="text-border">·</span>
          <span className="text-xs">
            Agentic, Retrieval-Augmented, Diagram-Driven Course Question Generation
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-primary" />
            Extraction
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-accent" />
            Generation
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-secondary" />
            Answering
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-foreground/60" />
            Verification
          </span>
        </div>
      </div>
    </footer>
  )
}
