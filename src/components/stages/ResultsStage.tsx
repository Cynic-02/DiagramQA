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
  Save,
  Trash2,
  CheckCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { usePipelineStore } from '@/lib/store'
import { BLOOM_META } from '@/lib/bloom'
import type { FinalQAItem } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Folder from '@/components/reactbits/Folder'
import BorderGlow from '@/components/reactbits/BorderGlow'
import { StageFrame, EmptyState, DataChip, KV } from './shared'
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
  const folderColor = resolvedTheme === 'light' ? '#1a6b8a' : '#3ba4c7'
  const status = usePipelineStore((s) => s.stages.results.status)
  const running = usePipelineStore((s) => s.running)
  const bloomLevel = usePipelineStore((s) => s.bloomLevel)
  const resetRun = usePipelineStore((s) => s.resetRun)
  const diagramDataUrl = usePipelineStore((s) => s.diagramDataUrl)
  const runId = usePipelineStore((s) => s.runId)
  const [zoomOpen, setZoomOpen] = React.useState(false)
  const [scale, setScale] = React.useState(1)

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
    if (runId) {
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

        {/* Workspace mode selector */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-border/40 pb-4 gap-4">
          <div className="flex items-center gap-1.5 p-1 bg-muted/20 border border-border/30 rounded-xl">
            <button
              onClick={() => setMode('view')}
              type="button"
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                mode === 'view' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              👀 View Mode
            </button>
            <button
              onClick={() => setMode('review')}
              type="button"
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                mode === 'review' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              ✏️ Teacher Review
            </button>
            <button
              onClick={() => setMode('quiz')}
              type="button"
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                mode === 'quiz' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              🎓 Student Practice
            </button>
          </div>

          {mode === 'review' && (
            <Button
              size="sm"
              onClick={() => saveEdits(editedQA)}
              className="gap-1.5 font-bold"
            >
              <Save className="size-3.5" />
              Save Question Bank
            </Button>
          )}
        </div>

        {/* Filter + sort bar */}
        {mode === 'view' && finalQA.length > 1 && (
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

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 space-y-3">
            {mode === 'review' ? (
              <TeacherWorkspace
                runId={runId || ''}
                questions={finalQA.map(q => ({
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
                  const mapped = updatedQs.map(q => ({
                    id: q.id,
                    question: q.text,
                    answer: q.answer,
                    bloomLevel: q.bloomLevel as any,
                    cognitiveSkill: q.bloomLevel.toLowerCase(),
                    verification: q.isApproved ? (q.verificationVerdict?.toLowerCase() as any || 'pass') : 'flagged',
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
              <StudentQuizView
                runId={runId || ''}
                questions={finalQA}
              />
            ) : (
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

              {/* Folder assignment */}
              <div className="border-b border-border/40 pb-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Course Folder</h3>
                  {selectedFolderId && (
                    <span className="text-[9px] text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      Assigned
                    </span>
                  )}
                </div>
                
                <select
                  value={selectedFolderId || 'none'}
                  onChange={(e) => handleAssignFolder(e.target.value)}
                  className="w-full h-8 rounded-md border border-border bg-card px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                >
                  <option value="none">-- Select Course Folder --</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>📁 {f.name}</option>
                  ))}
                </select>

                <form onSubmit={handleCreateFolder} className="flex gap-1.5 pt-1">
                  <Input
                    type="text"
                    placeholder="New Course Folder..."
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="h-7 text-[11px] flex-1"
                  />
                  <Button 
                    type="submit" 
                    disabled={creatingFolder || !newFolderName.trim()} 
                    size="xs"
                    className="h-7 px-2 font-bold"
                  >
                    {creatingFolder ? '...' : 'Create'}
                  </Button>
                </form>
              </div>

              <div className="border-b border-border/40 pb-4 space-y-2">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Export Course Materials</h3>
                <div className="grid grid-cols-2 gap-1.5">
                  <Button 
                    variant="outline" 
                    size="xs" 
                    onClick={() => window.open(`/api/runs/${runId}/export?format=csv`, '_blank')}
                    className="text-[10px] font-bold h-7"
                  >
                    CSV File
                  </Button>
                  <Button 
                    variant="outline" 
                    size="xs" 
                    onClick={() => window.open(`/api/runs/${runId}/export?format=moodle`, '_blank')}
                    className="text-[10px] font-bold h-7"
                  >
                    Moodle XML
                  </Button>
                  <Button 
                    variant="outline" 
                    size="xs" 
                    onClick={() => window.open(`/api/runs/${runId}/export?format=qti`, '_blank')}
                    className="text-[10px] font-bold h-7"
                  >
                    Canvas QTI
                  </Button>
                  <Button 
                    variant="outline" 
                    size="xs" 
                    onClick={() => window.print()}
                    className="text-[10px] font-bold h-7"
                  >
                    Print Test
                  </Button>
                </div>
              </div>

              {diagramDataUrl && (
                <div className="border-b border-border/40 pb-4">
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Uploaded Diagram</h3>
                  <div
                    onClick={() => { setScale(1); setZoomOpen(true); }}
                    className="relative aspect-video w-full overflow-hidden border border-border/40 rounded-lg bg-muted/20 hover:scale-[1.01] transition-all cursor-zoom-in group/thumb"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={diagramDataUrl}
                      alt="Uploaded diagram"
                      className="h-full w-full object-cover group-hover/thumb:opacity-90 transition-opacity"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/15 opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                      <span className="rounded-full bg-card/95 px-2.5 py-1 text-[9px] font-bold shadow border border-border/40">Click to Zoom</span>
                    </div>
                  </div>
                </div>
              )}

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

      {/* Diagram Zoom Lightbox Modal */}
      <AnimatePresence>
        {zoomOpen && diagramDataUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex flex-col items-center justify-center bg-background/95 backdrop-blur-md p-4"
          >
            {/* Top Toolbar */}
            <div className="absolute top-4 left-4 right-4 z-[160] flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-muted-foreground uppercase tracking-wider">
                Diagram Viewer · Scale: {Math.round(scale * 100)}%
              </span>
              
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="size-8 rounded-full p-0"
                  onClick={() => setScale((s) => Math.max(1, s - 0.25))}
                  disabled={scale <= 1}
                >
                  —
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="size-8 rounded-full p-0"
                  onClick={() => setScale((s) => Math.min(3, s + 0.25))}
                  disabled={scale >= 3}
                >
                  +
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 px-2.5 rounded-full text-xs"
                  onClick={() => setScale(1)}
                >
                  Reset
                </Button>
                <Button 
                  variant="default" 
                  size="sm" 
                  className="size-8 rounded-full p-0 bg-primary text-primary-foreground hover:bg-primary/95"
                  onClick={() => setZoomOpen(false)}
                >
                  ✕
                </Button>
              </div>
            </div>

            {/* Scrollable Container */}
            <div 
              className="w-full h-full flex items-center justify-center overflow-auto p-12 cursor-zoom-out"
              onClick={() => setZoomOpen(false)}
            >
              <div 
                className="relative transition-transform duration-200 ease-out shadow-2xl rounded-xl border border-border/45 overflow-hidden bg-card"
                style={{ 
                  transform: `scale(${scale})`,
                  maxHeight: '85vh',
                  maxWidth: '85vw'
                }}
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

