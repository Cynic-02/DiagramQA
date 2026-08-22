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
import { cn } from '@/lib/utils'
import {
  AlertCircle,
  RotateCcw,
  Download,
  ListChecks,
  MoreHorizontal,
  Check,
  AlertTriangle,
  Copy,
  CheckCheck,
  MessageCircle,
  Eye,
  EyeOff,
  Save,
} from 'lucide-react'
import { toast } from 'sonner'
import { usePipelineStore } from '@/lib/store'
import { BLOOM_META } from '@/lib/bloom'
import { isDemoRun } from '@/lib/demo-run'
import type { FinalQAItem } from '@/lib/types'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StageFrame, EmptyState } from './shared'
import { AgentThinkingConsole } from './AgentThinkingConsole'
import { MiniGraph } from './MiniGraph'
import { CountUpText } from '@/hooks/use-count-up'
import { TeacherWorkspace } from './TeacherWorkspace'
import { StudentQuizView } from './StudentQuizView'
import {
  ResultsFilterBar,
  applyFilters,
  DEFAULT_FILTERS,
  type FilterState,
} from './ResultsFilterBar'

export function ResultsStage() {
  const finalQA = usePipelineStore((s) => s.finalQA)
  const extraction = usePipelineStore((s) => s.extraction)
  const completed = usePipelineStore((s) => s.completed)
  const failed = usePipelineStore((s) => s.failed)
  const errorMessage = usePipelineStore((s) => s.errorMessage)
  const setChatOpen = usePipelineStore((s) => s.setChatOpen)
  const [revealAll, setRevealAll] = React.useState(false)
  const status = usePipelineStore((s) => s.stages.results.status)
  const running = usePipelineStore((s) => s.running)
  const bloomLevel = usePipelineStore((s) => s.bloomLevel)
  const resetRun = usePipelineStore((s) => s.resetRun)
  const diagramDataUrl = usePipelineStore((s) => s.diagramDataUrl)
  const runId = usePipelineStore((s) => s.runId)
  const [zoomOpen, setZoomOpen] = React.useState(false)
  const [scale, setScale] = React.useState(1)
  // The right rail used to stack the export folder, a course-folder form,
  // four export buttons, a diagram thumb, a node graph, a donut and a
  // six-row table into one column — seven unrelated things competing at
  // the same weight. They are three concerns, so they are three tabs.
  const [railTab, setRailTab] = React.useState<'stats' | 'source' | 'export'>('stats')

  const [folders, setFolders] = React.useState<any[]>([])
  const [selectedFolderId, setSelectedFolderId] = React.useState<string>('')
  const [newFolderName, setNewFolderName] = React.useState('')
  const [creatingFolder, setCreatingFolder] = React.useState(false)

  const fetchFolders = async () => {
    try {
      const res = await fetch('/api/folders')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setFolders(data.folders || [])
    } catch (e) {
      console.error('Failed to fetch folders')
    }
  }

  React.useEffect(() => {
    // A scripted demo run exists only in the browser — it has no folder
    // assignment and no /api/runs row to read back.
    if (runId && !isDemoRun(runId)) {
      fetchFolders()
      fetch(`/api/runs/${runId}`)
        .then(r => r.json())
        .then((data) => {
          if (data.folderId) {
            setSelectedFolderId(data.folderId)
          }
        }).catch(() => undefined)
    }
  }, [runId])

  const handleAssignFolder = async (folderId: string) => {
    if (!runId) return
    try {
      const res = await fetch(`/api/runs/${runId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: folderId === 'none' ? null : folderId }),
      })
      if (!res.ok) throw new Error()
      setSelectedFolderId(folderId === 'none' ? '' : folderId)
      toast.success(folderId === 'none' ? 'Run unassigned from folder' : 'Run assigned to folder successfully')
    } catch {
      toast.error('Failed to assign folder')
    }
  }

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFolderName.trim()) return
    setCreatingFolder(true)
    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      toast.success(`Course folder "${newFolderName}" created!`)
      setNewFolderName('')
      await fetchFolders()
      if (data.folder?.id) {
        await handleAssignFolder(data.folder.id)
      }
    } catch {
      toast.error('Could not create folder')
    } finally {
      setCreatingFolder(false)
    }
  }

  // workspace modes
  const [mode, setMode] = React.useState<'view' | 'review' | 'quiz'>('view')
  const [editedQA, setEditedQA] = React.useState<FinalQAItem[]>([])

  // Quiz progress states
  const [currentQuizIndex, setCurrentQuizIndex] = React.useState(0)
  const [quizAnswers, setQuizAnswers] = React.useState<Record<number, { pickedOption: number | null; textAnswer: string; submitted: boolean }>>({})
  const [quizFinished, setQuizFinished] = React.useState(false)

  React.useEffect(() => {
    if (finalQA) {
      setEditedQA(JSON.parse(JSON.stringify(finalQA)))
      setCurrentQuizIndex(0)
      setQuizAnswers({})
      setQuizFinished(false)
    }
  }, [finalQA])

  const saveEdits = async (updatedQA: FinalQAItem[]) => {
    if (!runId) return
    if (isDemoRun(runId)) {
      // Demo edits are real, they just have nowhere to persist to.
      usePipelineStore.setState({ finalQA: updatedQA })
      setEditedQA(updatedQA)
      toast.success('Edits applied (demo run — not saved to the server)')
      return
    }
    try {
      const res = await fetch(`/api/runs/${runId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          finalQA: updatedQA,
        }),
      })
      if (!res.ok) throw new Error()
      usePipelineStore.setState({ finalQA: updatedQA })
      setEditedQA(updatedQA)
      toast.success('Question edits saved to course bank')
    } catch {
      toast.error('Failed to save edits to server')
    }
  }

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
        <Card className="border-[var(--red)] bg-[color-mix(in_srgb,var(--red)_8%,transparent)] p-6 shadow-[4px_4px_0_var(--red)]">
          <div className="flex items-start gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-[var(--r-s)] border-2 border-[var(--line)] bg-[var(--red)] text-white">
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
      schema: 'diagrammind.finalQA/v1',
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

  const chips: Array<[string, string]> = [
    ['level', bloomLevel],
    ...(extraction ? ([['diagram', extraction.diagramType]] as Array<[string, string]>) : []),
    ['avg score', avgScore.toFixed(2)],
    ['pass rate', `${Math.round(passRate * 100)}%`],
  ]

  const MODES: Array<{ id: typeof mode; label: string }> = [
    { id: 'view', label: 'View' },
    { id: 'review', label: 'Review' },
    { id: 'quiz', label: 'Practice' },
  ]

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* ============================ MASTHEAD ============================ */}
      <header className="shrink-0 border-b-2 border-[var(--line)]/45 bg-[var(--card)]">
        <div className="flex flex-col gap-3 px-5 py-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6 md:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <span className="inline-block shrink-0 rounded-[var(--r-xs)] border-[1.5px] border-[var(--line)] bg-[var(--bloom-3)] px-2 py-[3px] font-mono text-[10px] font-bold uppercase leading-none tracking-[0.16em] text-[#0a0a0a]">
              06 / 06
            </span>
            <div className="min-w-0">
              <h1 className="flex items-baseline gap-2 font-[family-name:var(--font-archivo)] text-xl font-black uppercase leading-none tracking-[-0.03em] md:text-[26px]">
                {/* The count is the payoff, so it is set large — and
                    hollow, so "large" does not also mean "loudest thing
                    on a screen whose real job is the questions below". */}
                <span
                  className="text-[34px] leading-none text-transparent md:text-[40px]"
                  style={{ WebkitTextStroke: '2px var(--red)', paintOrder: 'stroke fill' }}
                >
                  <CountUpText value={finalQA.length} duration={700} />
                </span>
                <span>verified {finalQA.length === 1 ? 'question' : 'questions'}</span>
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                {chips.map(([k, v]) => (
                  <span key={k} className="font-mono text-[10px] uppercase tracking-[0.1em]">
                    <span className="text-[var(--ink-2)]">{k} </span>
                    <span className="font-bold text-[var(--ink)]">{v}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ---- ACTIONS ----
              Was: a segmented control plus four peer buttons — Reveal,
              Ask, New run, JSON — all the same size, all the same
              weight, sitting under a top bar that was itself carrying
              six controls, above a filter bar carrying seven more.
              Twenty-odd targets stacked in three rows, none of them
              ranked, which is a toolbar in the shape of a wall.

              Ranked now. The mode switch is the one control that
              changes what the whole page is, so it keeps its full
              width. Exactly one primary button follows, and which one
              it is depends on the mode — Reveal when you are reading,
              Save when you are editing. The other three were never
              peers of those: Ask opens a panel, New run leaves the
              page, JSON is a download, and all three are things you do
              once at the end. They live behind one overflow button.

              Four buttons became two, and the two that are left are
              the two you actually reach for. */}
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <div
              data-segmented
              className="flex overflow-hidden rounded-[var(--r-s)] border-[1.5px] border-[var(--line)]"
            >
              {MODES.map((m, i) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  aria-pressed={mode === m.id}
                  className={cn(
                    'px-3.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] transition-colors duration-[90ms]',
                    i > 0 && 'border-l-[1.5px] border-[var(--line)]',
                    mode === m.id
                      ? 'bg-[var(--ink)] text-[var(--paper)]'
                      : 'text-[var(--ink-2)] hover:bg-[var(--yellow)] hover:text-[#0a0a0a]',
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {mode === 'review' ? (
              <Button size="sm" onClick={() => saveEdits(editedQA)}>
                <Save className="size-3.5" />
                Save bank
              </Button>
            ) : (
              <Button
                variant={revealAll ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRevealAll((v) => !v)}
              >
                {revealAll ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                {revealAll ? 'Hide' : 'Reveal'}
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="px-2" aria-label="More actions">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[190px]">
                <DropdownMenuItem onSelect={() => setChatOpen(true)}>
                  <MessageCircle className="size-3.5" />
                  Ask about this set
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={download}>
                  <Download className="size-3.5" />
                  Download JSON
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={resetRun}>
                  <RotateCcw className="size-3.5" />
                  Start a new run
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* ============================== BODY ============================== */}
      <div className="flex min-h-0 flex-1">
        {/* ---------- question pane ---------- */}
        <div className="flex min-w-0 flex-1 flex-col">
          {mode === 'view' && finalQA.length > 1 && (
            <div className="shrink-0 border-b-2 border-[var(--line)]/20 bg-transparent px-5 py-2 md:px-8">
              <ResultsFilterBar
                state={filters}
                onChange={setFilters}
                totalCount={finalQA.length}
                filteredCount={filteredQA.length}
                availableLevels={availableLevels}
              />
            </div>
          )}

          <div className="scroll-slim min-h-0 flex-1 overflow-y-auto px-5 py-4 md:px-8">
            {mode === 'review' ? (
              <TeacherWorkspace
                runId={runId || ''}
                questions={finalQA.map((q) => ({
                  id: q.id,
                  runId: runId || '',
                  bloomLevel: q.bloomLevel,
                  type: q.questionType?.toUpperCase() === 'MCQ' ? 'MCQ' : 'SHORT',
                  text: q.question,
                  options: q.options || null,
                  correctOptionIndex: q.correctOptionIndex || null,
                  answer: q.answer,
                  explanation: q.explanation || null,
                  verificationScore: q.score ? Math.round(q.score * 100) : null,
                  verificationVerdict: q.verification.toUpperCase(),
                  isApproved: q.verification !== 'reject',
                }))}
                onQuestionsUpdate={(updatedQs) => {
                  const mapped = updatedQs.map((q) => ({
                    id: q.id,
                    question: q.text,
                    answer: q.answer,
                    bloomLevel: q.bloomLevel as any,
                    cognitiveSkill: q.bloomLevel.toLowerCase(),
                    verification: q.isApproved
                      ? ((q.verificationVerdict?.toLowerCase() as any) || 'pass')
                      : 'flagged',
                    score: q.verificationScore ? q.verificationScore / 100 : 0.95,
                    questionType: q.type.toLowerCase() as any,
                    options: q.options || undefined,
                    correctOptionIndex: q.correctOptionIndex || undefined,
                    explanation: q.explanation || undefined,
                  }))
                  usePipelineStore.setState({ finalQA: mapped })
                }}
              />
            ) : mode === 'quiz' ? (
              <StudentQuizView runId={runId || ''} questions={finalQA} />
            ) : (
              /* A card grid, not a stack of full-width bars — and an
                 EVEN one. `items-start` sized every card to its own
                 content, so a one-line question sat next to a
                 five-line one and the row looked broken; and because
                 the grid only claimed the height its content needed,
                 whatever the pane had left over pooled as dead paper
                 underneath.

                 The fix is smaller than it looks: a grid already
                 stretches its items to the tallest in the row, so
                 `h-full` on the card is all that "even" ever needed.
                 What is NOT needed is forcing the rows themselves to
                 divide the pane — `min-h-full` plus `1fr` rows did make
                 the grid fill the screen, but it filled it by inflating
                 every card until each one was mostly empty graph paper
                 with a question floating at the top. Even and hollow is
                 worse than uneven. Rows are content-sized again; the
                 cards inside a row still match each other. */
              /* Was fixed 2/3/4-column breakpoints, and at most widths
                 that made each card roughly twice as wide as it was
                 tall — a row of long bars, not a grid of cards. Auto-fill
                 with a ~300px basis means the column count adapts to
                 whatever width is actually available (never stretching
                 a lone card to fill a whole wide row) and, paired with
                 the taller min-height on the card itself below, each
                 cell now lands close to 1:1 instead of a wide rectangle. */
              <div className="grid w-full gap-6 grid-cols-[repeat(auto-fill,minmax(292px,1fr))]">
                <AnimatePresence mode="popLayout">
                  {filteredQA.map((qa, i) => (
                    <FinalQACard key={qa.id} qa={qa} index={i} revealAll={revealAll} />
                  ))}
                </AnimatePresence>

                {filteredQA.length === 0 && (
                  <div className="col-span-full mx-auto flex max-w-[440px] flex-col items-center justify-center gap-2 rounded-[var(--r)] border-2 border-dashed border-[var(--line)]/35 bg-[var(--card)] px-6 py-10 text-center">
                    <p className="text-sm font-bold">No questions match these filters</p>
                    <button
                      type="button"
                      onClick={() => setFilters(DEFAULT_FILTERS)}
                      className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--red)] underline underline-offset-4"
                    >
                      Clear filters
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ---------- right rail: three tabs, one visible at a time ---------- */}
        {extraction && (
          <aside className="hidden w-[290px] shrink-0 flex-col border-l-2 border-[var(--line)]/30 bg-[var(--card)] xl:flex">
            <div className="flex shrink-0 border-b-2 border-[var(--line)]/20">
              {(['stats', 'source', 'export'] as const).map((t, i) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setRailTab(t)}
                  aria-pressed={railTab === t}
                  /* The active tab was a full red fill, which put the
                     loudest colour on the page on a three-way view
                     switch for a side rail — louder than the primary
                     button in the masthead directly above it. An
                     underline in the same red says the same thing and
                     stops competing. */
                  className={cn(
                    'flex-1 rounded-none border-b-2 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] transition-colors duration-[90ms]',
                    i > 0 && 'border-l-[1.5px] border-l-[var(--line)]/20',
                    railTab === t
                      ? 'border-b-[var(--red)] text-[var(--ink)]'
                      : 'border-b-transparent text-[var(--ink-2)] hover:bg-[var(--yellow)] hover:text-[#0a0a0a]',
                  )}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="scroll-slim min-h-0 flex-1 overflow-y-auto p-3">
              {railTab === 'stats' && (
                <div className="space-y-4">
                  <div>
                    <RailLabel>Verification</RailLabel>
                    <VerificationDonut finalQA={finalQA} />
                  </div>
                  <div>
                    <RailLabel>Run</RailLabel>
                    <dl className="overflow-hidden rounded-[var(--r-s)] border-[1.5px] border-[var(--line)]/45">
                      {(
                        [
                          ['Questions', String(finalQA.length)],
                          ['Avg score', avgScore.toFixed(2)],
                          ['Pass rate', `${Math.round(passRate * 100)}%`],
                          ['Bloom level', bloomLevel],
                          ['Entities', String(extraction.entities.length)],
                          ['Relations', String(extraction.relationships.length)],
                          ['Diagram', extraction.diagramType],
                        ] as Array<[string, string]>
                      ).map(([k, v]) => (
                        <div
                          key={k}
                          className="flex items-baseline justify-between gap-2 border-b-2 border-[var(--line)]/25 px-2.5 py-1.5 last:border-b-0"
                        >
                          <dt className="shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--ink-2)]">
                            {k}
                          </dt>
                          <dd className="dat min-w-0 truncate text-right text-[11px] font-bold" title={v}>
                            {v}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>
              )}

              {railTab === 'source' && (
                <div className="space-y-4">
                  {diagramDataUrl && (
                    <div>
                      <RailLabel>Diagram</RailLabel>
                      <button
                        type="button"
                        onClick={() => {
                          setScale(1)
                          setZoomOpen(true)
                        }}
                        className="group block w-full cursor-zoom-in rounded-[var(--r-s)] border-[1.5px] border-[var(--line)]/45 bg-[var(--paper)] p-1"
                        title="Click to zoom"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={diagramDataUrl}
                          alt="Source diagram"
                          className="h-auto w-full object-contain"
                        />
                      </button>
                    </div>
                  )}
                  <div>
                    <RailLabel>Extracted graph</RailLabel>
                    <div className="rounded-[var(--r-s)] border-[1.5px] border-[var(--line)]/45 p-1">
                      <MiniGraph extraction={extraction} />
                    </div>
                  </div>
                  <p className="text-[11px] leading-relaxed text-[var(--ink-2)]">
                    {extraction.summary}
                  </p>
                </div>
              )}

              {railTab === 'export' && (
                <div className="space-y-4">
                  <div>
                    <RailLabel>Course folder</RailLabel>
                    <select
                      value={selectedFolderId || 'none'}
                      onChange={(e) => handleAssignFolder(e.target.value)}
                      className="h-8 w-full rounded-[var(--r-s)] border-[1.5px] border-[var(--line)] bg-[var(--card)] px-2 text-[11px] focus:outline-none"
                    >
                      <option value="none">— unassigned —</option>
                      {folders.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                    <form onSubmit={handleCreateFolder} className="mt-1.5 flex gap-1.5">
                      <Input
                        type="text"
                        placeholder="New folder…"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        className="h-8 flex-1 text-[11px]"
                      />
                      <Button
                        type="submit"
                        size="xs"
                        disabled={creatingFolder || !newFolderName.trim()}
                        className="h-8"
                      >
                        {creatingFolder ? '…' : 'Add'}
                      </Button>
                    </form>
                  </div>

                  <div>
                    <RailLabel>Export</RailLabel>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(
                        [
                          ['CSV', 'csv'],
                          ['Moodle XML', 'moodle'],
                          ['Canvas QTI', 'qti'],
                        ] as Array<[string, string]>
                      ).map(([label, fmt]) => (
                        <Button
                          key={fmt}
                          variant="outline"
                          size="xs"
                          onClick={() =>
                            window.open(`/api/runs/${runId}/export?format=${fmt}`, '_blank')
                          }
                          disabled={isDemoRun(runId)}
                          title={
                            isDemoRun(runId)
                              ? 'Server-side export is unavailable for the offline demo run'
                              : undefined
                          }
                          className="h-8"
                        >
                          {label}
                        </Button>
                      ))}
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => window.print()}
                        className="h-8"
                      >
                        Print
                      </Button>
                    </div>
                    <Button size="sm" onClick={download} className="mt-1.5 w-full">
                      <Download className="size-3.5" />
                      Download JSON
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* ---------- diagram lightbox ---------- */}
      <AnimatePresence>
        {zoomOpen && diagramDataUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex flex-col items-center justify-center bg-[var(--paper)] p-4"
          >
            <div className="absolute left-4 right-4 top-4 z-[160] flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--ink-2)]">
                Diagram viewer · {Math.round(scale * 100)}%
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="xs"
                  className="size-8 p-0"
                  onClick={() => setScale((v) => Math.max(1, v - 0.25))}
                  disabled={scale <= 1}
                >
                  −
                </Button>
                <Button
                  variant="outline"
                  size="xs"
                  className="size-8 p-0"
                  onClick={() => setScale((v) => Math.min(3, v + 0.25))}
                  disabled={scale >= 3}
                >
                  +
                </Button>
                <Button variant="outline" size="xs" className="h-8" onClick={() => setScale(1)}>
                  Reset
                </Button>
                <Button size="xs" className="h-8" onClick={() => setZoomOpen(false)}>
                  Close
                </Button>
              </div>
            </div>

            <div
              className="flex h-full w-full cursor-zoom-out items-center justify-center overflow-auto p-12"
              onClick={() => setZoomOpen(false)}
            >
              <div
                className="relative overflow-hidden rounded-[var(--r-l)] border-2 border-[var(--line)] bg-[var(--card)] shadow-[8px_8px_0_var(--line)] transition-transform duration-200 ease-out"
                style={{ transform: `scale(${scale})`, maxHeight: '85vh', maxWidth: '85vw' }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={diagramDataUrl}
                  alt="Zoomed diagram"
                  className="max-h-[85vh] max-w-[85vw] object-contain"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function RailLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span className="fig-label">{children}</span>
      <span className="h-[2px] flex-1 rounded-none bg-[var(--line)]/18" aria-hidden />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* One verified question.                                              */
/*                                                                     */
/* The previous card was a hard black rectangle containing a second    */
/* hard dashed black rectangle where the answer would go, repeated     */
/* down the page. Twenty of those is not a question bank, it is a      */
/* stack of empty forms — and the one piece of information that could  */
/* have told them apart, the Bloom level, was spent on a small tinted  */
/* pill at the bottom.                                                 */
/*                                                                     */
/* So the Bloom hue moves to a spine down the card's left edge, where  */
/* it does structural work: a scrolling column of cards now reads as a */
/* distribution across the taxonomy at a glance. The answer is a       */
/* tinted panel rather than a dashed void, and revealing it is a       */
/* button the size of a button.                                        */
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
    <motion.article
      layout
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.98 }}
      transition={{ duration: 0.3, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
      /* Glass, not paper. The fill is translucent and blurred so the
         field and the graph paper carry on underneath the card; the
         border stays hard ink at full strength, which is what keeps a
         see-through panel from losing its own edges. */
      /* min-height raised from 236px toward the card's own column width
         (~292px) so a card lands close to a 1:1 square instead of a
         wide short rectangle — matches the auto-fill grid above. */
      className="lift glass-surface group flex h-full min-h-[300px] overflow-hidden rounded-[var(--r-l)] border-2 border-[var(--line)] shadow-[2px_2px_0_var(--line)]"
      style={{ '--sh': '2px' } as React.CSSProperties}
    >
      {/* the Bloom spine */}
      <span
        className="w-[5px] shrink-0 rounded-none"
        style={{ background: meta.hue }}
        aria-hidden
        title={qa.bloomLevel}
      />

      {/* FOUR ZONES, FOUR GROUNDS.
          Title, question, working area, verdict. Each partition sits on
          its own surface, stepped down the same Bloom hue — 22% for the
          title bar, 8% for the question, bare glass for the working
          area, card for the verdict. One colour, four values: the card
          is legible as a structure before a single word of it is read,
          and it does not cost a second colour to say so. */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* ---- zone 1 · title ---- */}
        <div
          className="flex shrink-0 items-center gap-2 border-b-2 border-[var(--line)]/12 px-3 py-1.5"
          style={{ background: `color-mix(in srgb, ${meta.hue} 24%, transparent)` }}
        >
          <span className="font-[family-name:var(--font-archivo)] text-[11.5px] font-black uppercase leading-none tracking-[0.04em]">
            Q{index + 1}
          </span>
          <span
            className="rounded-[var(--r-xs)] border-[1.5px] border-[var(--line)] px-1.5 py-[2px] font-mono text-[8.5px] font-bold uppercase leading-none tracking-[0.12em]"
            style={{ backgroundColor: meta.hue, color: meta.fg }}
          >
            {qa.bloomLevel}
          </span>
          <span className="truncate font-mono text-[8.5px] uppercase tracking-[0.12em] text-[var(--ink-2)]">
            {qa.cognitiveSkill}
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-1">
            <ScoreRing score={qa.score} pending={!showAnswer} pass={pass} />
            <button
              type="button"
              onClick={copyQA}
              aria-label="Copy Q&A"
              className="shrink-0 rounded-[var(--r-xs)] border-[1.5px] border-transparent p-1 text-[var(--ink-2)] opacity-0 transition-all hover:border-[var(--line)] hover:bg-[var(--yellow)] hover:text-[#0a0a0a] focus-visible:opacity-100 group-hover:opacity-100"
            >
              {copied ? <CheckCheck className="size-3.5" /> : <Copy className="size-3.5" />}
            </button>
          </span>
        </div>

        {/* ---- zone 2 · the question ---- */}
        <div
          className="shrink-0 border-b-2 border-[var(--line)]/10 px-3.5 py-2.5"
          style={{ background: `color-mix(in srgb, ${meta.hue} 8%, transparent)` }}
        >
          <p className="text-[13px] font-bold leading-snug">{qa.question}</p>
        </div>

        {/* ---- zone 3 · the working area ----
            `justify-center` so a card that only has a "Show answer"
            button in this slot doesn't leave it stranded at the top with
            a wall of empty paper underneath — the content centres in
            whatever room the card gives it. */}
        <div className="glass-inner flex flex-1 flex-col justify-center gap-2 px-3.5 py-2.5">
          {isMcq && (
            <ul className="space-y-1.5">
              {qa.options!.map((opt, i) => {
                const isCorrectOption = i === qa.correctOptionIndex
                const isPicked = i === pickedOption
                // Before an attempt: every option looks the same — no
                // hint at the correct answer. After: the correct option
                // is highlighted, and a wrong pick is marked too.
                const style = !showAnswer
                  ? 'border-[var(--line)]/25 bg-[var(--card)] hover:border-[var(--line)] hover:bg-[var(--yellow)] cursor-pointer'
                  : isCorrectOption
                  ? 'border-[var(--line)] bg-[var(--yellow)] font-bold text-[#0a0a0a]'
                  : isPicked
                  ? 'border-[var(--red)] bg-[color-mix(in_srgb,var(--red)_10%,transparent)]'
                  : 'border-[var(--line)]/20 bg-transparent text-[var(--ink-2)]'
                return (
                  <li key={i}>
                    <button
                      type="button"
                      disabled={showAnswer}
                      onClick={() => setPickedOption(i)}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-[var(--r-s)] border-[1.5px] px-3 py-2 text-left text-[13px] transition-colors duration-[90ms]',
                        style,
                      )}
                    >
                      <span className="font-mono text-[11px] font-bold">
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="flex-1">{opt}</span>
                      {showAnswer && isCorrectOption && <Check className="size-3.5 shrink-0" strokeWidth={3} />}
                      {showAnswer && isPicked && !isCorrectOption && (
                        <span className="shrink-0 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--red)]">
                          your pick
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          {!isMcq && !showAnswer && (
            <button
              type="button"
              onClick={() => setAnswerShown(true)}
              className="inline-flex items-center gap-2 rounded-[var(--r-s)] border-[1.5px] border-[var(--line)] bg-[var(--card)] px-3.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] shadow-[3px_3px_0_var(--line)] transition-[transform,box-shadow] duration-[90ms] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none"
            >
              <Eye className="size-3.5" />
              Show answer
            </button>
          )}

          {showAnswer && (
            <div
              className="rounded-[var(--r-s)] border-[1.5px] border-[var(--line)]/25 bg-[var(--card)] px-3.5 py-2.5"
              style={{ borderLeft: `4px solid ${meta.hue}` }}
            >
              <div className="fig-label mb-1.5">Answer</div>
              <p className="text-[13px] leading-relaxed">{qa.answer}</p>
            </div>
          )}
        </div>

        {/* ---- zone 4 · the verdict ----
             The level and the skill moved up into the title bar, where
             they belong: they identify the card, they are not a
             conclusion about it. This strip now carries only the thing
             the pipeline actually decided. */}
        <div className="mt-auto flex shrink-0 flex-wrap items-center gap-2 border-t-2 border-[var(--line)]/15 bg-[color-mix(in_srgb,var(--card)_50%,transparent)] px-3.5 py-1.5">
          <span className="fig-label">Verifier</span>
          {showAnswer ? (
            <span
              className={cn(
                'ml-auto inline-flex items-center gap-1.5 rounded-[var(--r-xs)] border-[1.5px] px-2 py-[2px] font-mono text-[9px] font-bold uppercase tracking-[0.12em]',
                pass
                  ? 'border-[var(--line)] bg-[var(--bloom-3)] text-[#0a0a0a]'
                  : 'border-[var(--red)] bg-[color-mix(in_srgb,var(--red)_12%,transparent)] text-[var(--red)]',
              )}
            >
              {pass ? <Check className="size-2.5" strokeWidth={3.5} /> : <AlertTriangle className="size-2.5" />}
              {pass ? 'verified' : 'flagged'}
            </span>
          ) : (
            <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--ink-2)]">
              hidden until answered
            </span>
          )}
        </div>
      </div>
    </motion.article>
  )
}

/* ------------------------------------------------------------------ */
/* Verification distribution                                           */
/* ------------------------------------------------------------------ */

function VerificationDonut({ finalQA }: { finalQA: FinalQAItem[] }) {
  const reduce = useReducedMotion()
  const passed = finalQA.filter((q) => q.verification === 'pass').length
  const flagged = finalQA.length - passed
  const total = Math.max(1, finalQA.length)
  const passPct = passed / total

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-2">
        <span
          className="font-[family-name:var(--font-archivo)] text-[40px] font-black leading-none text-transparent"
          style={{ WebkitTextStroke: '2px var(--ink)', paintOrder: 'stroke fill' }}
        >
          {Math.round(passPct * 100)}%
        </span>
        <span className="pb-1 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--ink-2)]">
          pass rate
        </span>
      </div>
      <div className="flex h-3.5 w-full overflow-hidden rounded-full border-[1.5px] border-[var(--line)]">
        <motion.div
          className="h-full rounded-none bg-[var(--yellow)]"
          initial={reduce ? false : { width: 0 }}
          animate={{ width: `${passPct * 100}%` }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        />
        <div className="h-full flex-1 rounded-none bg-[color-mix(in_srgb,var(--red)_22%,transparent)]" />
      </div>
      <dl className="space-y-1.5">
        {(
          [
            ['Passed', passed, 'var(--yellow)'],
            ['Flagged', flagged, 'var(--red)'],
          ] as Array<[string, number, string]>
        ).map(([k, v, hue]) => (
          <div key={k} className="flex items-center justify-between text-[11.5px]">
            <dt className="flex items-center gap-2 font-bold text-[var(--ink-2)]">
              <span
                className="size-2.5 rounded-[2px] border-[1.5px] border-[var(--line)]"
                style={{ background: hue }}
              />
              {k}
            </dt>
            <dd className="dat font-bold">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function ScoreRing({
  score,
  pending,
  pass,
}: {
  score: number
  pending?: boolean
  pass?: boolean
}) {
  const hue = pending ? 'var(--line)' : pass ? 'var(--bloom-3)' : 'var(--red)'
  return (
    <span
      className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 font-[family-name:var(--font-archivo)] text-[11px] font-black"
      style={{
        borderColor: pending ? 'color-mix(in srgb, var(--line) 30%, transparent)' : 'var(--line)',
        background: pending ? 'transparent' : hue,
        color: pending ? 'var(--ink-2)' : '#0a0a0a',
      }}
      title={pending ? 'Answer hidden' : `Verifier score ${score.toFixed(2)}`}
    >
      {pending ? '?' : score.toFixed(1)}
    </span>
  )
}
