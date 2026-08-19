'use client'

/**
 * UploadStage — the entry point of the pipeline.
 *
 * Responsibilities:
 *   - Drag-and-drop / click-to-browse file picker (png/jpg/webp/svg + pdf)
 *   - Live preview of the selected diagram (or PDF icon card)
 *   - Bloom's-taxonomy difficulty selector (6 levels, colored by hue)
 *   - "Run pipeline →" CTA: POST /api/runs → setRunId + setDiagram +
 *     startRun → emit `pipeline:start` on the socket (waits for connect)
 *   - Sample-diagram affordance (inline SVG data URL — works offline)
 *   - Post-run view (when diagramDataUrl is already in the store):
 *     preview + bloom level + Re-run button.
 *
 * NOTE: the local `uploadedFile` state holds the pre-run file. The store's
 * `diagramDataUrl` is only set when the user actually starts a run, because
 * `setDiagram` couples the data-URL with the `upload:done` stage transition
 * and an `activeStage: 'extraction'` switch (which we don't want until the
 * user explicitly kicks off the pipeline).
 */

import * as React from 'react'
import Link from 'next/link'
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  FileText,
  RotateCcw,
  Play,
  Sparkles,
  ImageIcon,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { usePipelineStore } from '@/lib/store'
import { BLOOM_META } from '@/lib/bloom'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Lens } from '@/components/ui/lens'
import { StageFrame, StageHeader, DataChip } from './shared'
import { BloomWheel } from './BloomWheel'
import { ProviderSelect, useProviderOptions } from '@/components/provider-select'

/* ------------------------------------------------------------------ */
/* A small inline SVG flowchart used as the sample diagram.           */
/* ------------------------------------------------------------------ */

const SAMPLE_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='640' height='320' viewBox='0 0 640 320'>
  <defs>
    <marker id='arrow' markerWidth='10' markerHeight='10' refX='9' refY='5' orient='auto'>
      <path d='M0,0 L10,5 L0,10 Z' fill='#2dd4bf'/>
    </marker>
  </defs>
  <rect x='0' y='0' width='640' height='320' fill='#fdf6e9'/>
  <rect x='40' y='130' width='130' height='60' fill='#fdf6e9' stroke='#1a1a1a' stroke-width='3'/>
  <text x='105' y='165' text-anchor='middle' fill='#1a1a1a' font-family='sans-serif' font-size='14' font-weight='700'>Client</text>
  <rect x='255' y='130' width='130' height='60' fill='#fdf6e9' stroke='#1a1a1a' stroke-width='3'/>
  <text x='320' y='158' text-anchor='middle' fill='#1a1a1a' font-family='sans-serif' font-size='13' font-weight='700'>API</text>
  <text x='320' y='174' text-anchor='middle' fill='#525252' font-family='sans-serif' font-size='11'>Gateway</text>
  <rect x='470' y='130' width='130' height='60' fill='#fdf6e9' stroke='#1a1a1a' stroke-width='3'/>
  <text x='535' y='165' text-anchor='middle' fill='#1a1a1a' font-family='sans-serif' font-size='14' font-weight='700'>Database</text>
  <line x1='170' y1='160' x2='250' y2='160' stroke='#2dd4bf' stroke-width='3' marker-end='url(#arrow)'/>
  <line x1='385' y1='160' x2='465' y2='160' stroke='#2dd4bf' stroke-width='3' marker-end='url(#arrow)'/>
  <line x1='320' y1='130' x2='320' y2='70' stroke='#e8876f' stroke-width='3' stroke-dasharray='4 4'/>
  <rect x='255' y='30' width='130' height='40' fill='#f5f4f0' stroke='#e8876f' stroke-width='3'/>
  <text x='320' y='55' text-anchor='middle' fill='#e8876f' font-family='sans-serif' font-size='13' font-weight='700'>Cache</text>
  <text x='320' y='290' text-anchor='middle' fill='#525252' font-family='monospace' font-size='11'>AR2-DDCQG · sample architecture</text>
</svg>`

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function sniffMime(dataUrl: string): string {
  if (dataUrl.startsWith('data:application/pdf')) return 'application/pdf'
  if (dataUrl.startsWith('data:image/svg')) return 'image/svg+xml'
  if (dataUrl.startsWith('data:image/png')) return 'image/png'
  if (dataUrl.startsWith('data:image/webp')) return 'image/webp'
  if (dataUrl.startsWith('data:image/jpeg')) return 'image/jpeg'
  return 'image/png'
}

/**
 * The vision model only accepts raster images (PNG/JPEG/WebP). SVGs must be
 * rasterised to PNG on a <canvas> before being sent. Returns the original
 * data URL for non-SVG inputs. Resolves to a PNG data URL at 2× scale.
 */
function rasteriseIfNeeded(dataUrl: string, filename: string): Promise<{ dataUrl: string; name: string }> {
  if (!dataUrl.startsWith('data:image/svg')) {
    return Promise.resolve({ dataUrl, name: filename })
  }
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const scale = 2
      const w = (img.naturalWidth || img.width || 640) * scale
      const h = (img.naturalHeight || img.height || 320) * scale
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve({ dataUrl, name: filename })
        return
      }
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, w, h)
      ctx.drawImage(img, 0, 0, w, h)
      const png = canvas.toDataURL('image/png')
      const baseName = filename.replace(/\.svg$/i, '')
      resolve({ dataUrl: png, name: `${baseName}.png` })
    }
    img.onerror = () => resolve({ dataUrl, name: filename })
    img.src = dataUrl
  })
}

const ACCEPTED = '.png,.jpg,.jpeg,.webp,.svg'
// Base64-encoding inflates raw bytes by ~4/3, and the encoded string then
// rides inside a JSON body to POST /api/runs — which on Vercel has a hard
// 4.5MB request-body ceiling enforced by the platform itself (returns a
// raw, uncaught 413 before the request even reaches our route handler).
// 2.5MB raw comfortably clears that after inflation, with real headroom.
const MAX_BYTES = 2.5 * 1024 * 1024 // 2.5 MB

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export function UploadStage() {
  const reduce = useReducedMotion()

  // store state
  const diagramDataUrl = usePipelineStore((s) => s.diagramDataUrl)
  const diagramFilename = usePipelineStore((s) => s.diagramFilename)
  const bloomLevel = usePipelineStore((s) => s.bloomLevel)
  const running = usePipelineStore((s) => s.running)
  const selectedProvider = usePipelineStore((s) => s.selectedProvider)
  const questionCount = usePipelineStore((s) => s.questionCount)
  const mcqOnly = usePipelineStore((s) => s.mcqOnly)
  const setBloomLevel = usePipelineStore((s) => s.setBloomLevel)
  const setSelectedProvider = usePipelineStore((s) => s.setSelectedProvider)
  const setQuestionCount = usePipelineStore((s) => s.setQuestionCount)
  const setMcqOnly = usePipelineStore((s) => s.setMcqOnly)
  const setDiagram = usePipelineStore((s) => s.setDiagram)
  const setRunId = usePipelineStore((s) => s.setRunId)
  const startRun = usePipelineStore((s) => s.startRun)
  const resetRun = usePipelineStore((s) => s.resetRun)

  // local pre-run file (NOT in the store until the user starts a run)
  const [uploadedFile, setUploadedFile] = React.useState<{
    name: string
    dataUrl: string
  } | null>(null)
  const [dragOver, setDragOver] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const { providers, loading: loadingProviders } = useProviderOptions()
  const hasUsableProvider = React.useMemo(() => {
    if (loadingProviders) return true
    if (selectedProvider) {
      const selected = providers.find((p) => p.id === selectedProvider)
      return !!selected && selected.usable && (selected.isCustom || selected.supportsVision)
    }
    return providers.some((p) => !p.isCustom && p.usable && p.supportsVision)
  }, [providers, loadingProviders, selectedProvider])

  const hasRunDiagram = !!diagramDataUrl
  const previewName = hasRunDiagram ? diagramFilename : uploadedFile?.name
  const previewUrl = hasRunDiagram ? diagramDataUrl : uploadedFile?.dataUrl

  /* ---- file selection (local) ---- */
  const handleFile = React.useCallback((file: File) => {
    if (file.size > MAX_BYTES) {
      toast.error('File too large', {
        description: 'Please use a file under 2.5 MB.',
      })
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result
      if (typeof dataUrl !== 'string') return
      setUploadedFile({ name: file.name, dataUrl })
      toast.success('Diagram ready', { description: file.name })
    }
    reader.onerror = () => toast.error('Failed to read file')
    reader.readAsDataURL(file)
  }, [])

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const loadSample = () => {
    const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(SAMPLE_SVG)}`
    setUploadedFile({ name: 'sample-flowchart.svg', dataUrl })
    toast.success('Sample diagram loaded', {
      description: 'A small architecture flowchart — click Run to try the pipeline.',
    })
  }

  /* ---- run pipeline ---- */
  const runPipeline = async () => {
    const file = uploadedFile
    if (!file) return
    setSubmitting(true)
    try {
      // Rasterise SVGs to PNG — the vision model only accepts raster images.
      const { dataUrl: sendDataUrl, name: sendName } = await rasteriseIfNeeded(
        file.dataUrl,
        file.name,
      )
      const mimeType = sniffMime(sendDataUrl)
      const res = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: sendName,
          mimeType,
          dataUrl: sendDataUrl,
          bloomLevel,
          provider: selectedProvider,
          questionCount,
          mcqOnly,
        }),
      })
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(err.error || 'Failed to start run')
      }
      const { runId } = (await res.json()) as { runId: string }

      // 1) register run id
      setRunId(runId)
      // 2) mark upload done, switch active stage to extraction, store diagram
      setDiagram(sendName, sendDataUrl)
      // 3) start run (resets stage outputs, sets running=true)
      startRun()
      // 4) clear the local file — store now owns the diagram
      setUploadedFile(null)
      // Note: no explicit "start" call here. usePipelineStream watches
      // runId + running and opens the SSE connection to
      // /api/runs/[id]/stream itself, which is what actually kicks off
      // the pipeline server-side.

      toast.success('Pipeline started', {
        description: `Run ${runId.slice(0, 8)} · ${bloomLevel} · ${questionCount} question${questionCount === 1 ? '' : 's'}${mcqOnly ? ' (MCQ)' : ''}`,
      })
    } catch (e) {
      toast.error('Could not start pipeline', {
        description: e instanceof Error ? e.message : undefined,
      })
    } finally {
      setSubmitting(false)
    }
  }

  /* ---- post-run reset ---- */
  const handleReset = () => {
    resetRun()
    setUploadedFile(null)
  }

  /* ---------------------------------------------------------------- */
  /* Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <StageFrame stageId="upload" showHeader={false}>
      {/* Two-column only from xl. At lg the 280px rail leaves ~744px, which a
          420px side panel would squeeze to an unusable ~250px main column —
          so tablets and small laptops stack instead.
          The stage header lives inside the main column rather than spanning
          the full width, so the config panel starts level with it instead of
          being pushed below, which left a large empty block top-right. */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
        {/* ---------------- Left Column: Dropzone / Preview ---------------- */}
        <div className="min-w-0 space-y-3">
          <StageHeader stageId="upload" />
          <AnimatePresence mode="wait" initial={false}>
            {previewUrl ? (
              <motion.div
                key="preview"
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              >
                <Card className="brutal-block overflow-hidden p-0">
                  <div className="flex flex-col">
                    {/* The diagram, shown at rest and contained by its frame. */}
                    <div className="flex items-center justify-center bg-muted p-6 border-b border-border/40">
                      {previewUrl.startsWith('data:application/pdf') ? (
                        <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
                          <FileText className="size-12" />
                          <span className="text-sm font-semibold">PDF source</span>
                        </div>
                      ) : (
                        <Lens lensSize={340} zoomFactor={2.1}>
                          <img
                            src={previewUrl}
                            alt={previewName ?? 'Diagram preview'}
                            className="max-h-[260px] w-auto max-w-full object-contain"
                          />
                        </Lens>
                      )}
                    </div>

                    {/* File info */}
                    <div className="space-y-3 p-5 bg-card">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                            Source diagram
                          </div>
                          <p className="truncate text-sm font-bold">
                            {previewName}
                          </p>
                        </div>
                        {hasRunDiagram && (
                          <DataChip tone="emerald">
                            <span
                              className="size-1.5 rounded-full bg-accent-foreground"
                              aria-hidden
                            />
                            stored
                          </DataChip>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="dropzone"
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              >
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragOver(true)
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={onDrop}
                  aria-label="Upload diagram"
                  className={cn(
                    'group relative flex w-full flex-col items-center justify-center gap-3 border-2 border-dashed px-6 py-10 text-center transition-all rounded-[var(--radius)]',
                    dragOver
                      ? 'border-accent bg-accent/10'
                      : 'border-border bg-card hover:border-accent',
                  )}
                >
                  <div
                    className={cn(
                      'flex size-12 items-center justify-center border transition-all rounded-lg',
                      dragOver
                        ? 'border-border bg-accent text-accent-foreground'
                        : 'border-border bg-muted text-muted-foreground group-hover:text-accent group-hover:scale-105',
                    )}
                  >
                    <Upload className="size-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground/90">
                      {dragOver ? 'Drop to upload' : 'Drag a diagram here, or click to browse'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PNG · JPG · WebP · SVG — under 5&nbsp;MB
                    </p>
                  </div>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED}
                  onChange={onPick}
                  className="sr-only"
                  aria-hidden
                />
                <div className="mt-3 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={loadSample}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-all hover:text-accent hover:scale-[1.02]"
                  >
                    <Sparkles className="size-3" />
                    or try a sample diagram
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!hasRunDiagram && <DashboardStats />}

          {/* Primary action — sits directly under the workspace metrics.
              It previously lived at the foot of the ~900px config panel,
              which put it below the fold. The main column ends at the
              metrics row and had dead space underneath, so the action is
              both visible without scrolling and adjacent to the diagram it
              acts on. Hidden once a run is registered, matching the
              "Pipeline active" card that replaces the config panel. */}
          {!hasRunDiagram && (
            <Card className="space-y-3 border-border/60 bg-card p-4">
              {!hasUsableProvider ? (
                <div className="space-y-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] text-amber-500">
                  <p className="flex items-center gap-1.5 font-bold">
                    ⚠️ No Usable API Keys
                  </p>
                  <p className="leading-relaxed">
                    All AI providers are currently missing keys. Please add an API key in{' '}
                    <Link href="/app/settings/api-keys" className="font-bold underline hover:text-amber-400">
                      Settings
                    </Link>{' '}
                    to start the pipeline.
                  </p>
                </div>
              ) : (
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {uploadedFile
                    ? 'Ready to run. The vision agent will initiate the process on click.'
                    : 'Please select a diagram file to enable the agent pipeline.'}
                </p>
              )}
              <Button
                type="button"
                size="lg"
                onClick={runPipeline}
                disabled={!uploadedFile || submitting || running || !hasUsableProvider}
                className="spring-transition w-full hover:scale-[1.02] active:scale-[0.98]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Starting…
                  </>
                ) : (
                  <>
                    <Play className="size-4" />
                    Run pipeline →
                  </>
                )}
              </Button>
            </Card>
          )}
        </div>

        {/* ---------------- Right Column: Configuration ---------------- */}
        <div className="scroll-slim min-w-0 space-y-4 xl:sticky xl:top-[4.75rem] xl:max-h-[calc(100vh-6.5rem)] xl:overflow-y-auto xl:pr-1">
          {hasRunDiagram ? (
            <Card className="brutal-block p-5 space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Pipeline active</h3>
                <p className="text-xs text-muted-foreground">
                  The diagram has been registered and is being processed by the agent pipeline.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-border/40">
                <DataChip tone="emerald">{bloomLevel}</DataChip>
                <DataChip>{running ? 'running' : 'complete'}</DataChip>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  disabled={running}
                  className="ml-auto"
                >
                  <RotateCcw className="size-3.5" />
                  Reset stage
                </Button>
              </div>
            </Card>
          ) : (
            <>
              {/* AI Provider Select */}
              <div className="space-y-2">
                <div>
                  <h3 className="text-sm font-bold text-foreground">AI Provider</h3>
                  <p className="text-xs text-muted-foreground">
                    Vision and text model host running the pipeline stages.
                  </p>
                </div>
                <ProviderSelect
                  value={selectedProvider}
                  onChange={setSelectedProvider}
                  requireVision
                  className="h-10 w-full"
                />
              </div>

              {/* Bloom's level difficulty selection */}
              <div className="space-y-2">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Difficulty (Bloom&apos;s level)</h3>
                  <p className="text-xs text-muted-foreground">
                    Calibrate difficulty based on Bloom&apos;s Cognitive Taxonomy.
                  </p>
                </div>

                <Card className="brutal-block p-3.5 space-y-3">
                  <div className="mx-auto aspect-square w-full max-w-[218px]">
                    <BloomWheel value={bloomLevel} onChange={setBloomLevel} />
                  </div>

                  <div className="space-y-2 border-t border-border/40 pt-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <DataChip tone="emerald">
                        {BLOOM_META[bloomLevel].level}
                      </DataChip>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        verb · {BLOOM_META[bloomLevel].verb}
                      </span>
                    </div>
                    <div className="flex items-start gap-2.5 rounded-lg border border-border/50 bg-card/30 px-3.5 py-2.5">
                      <span
                        className="mt-1 size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: BLOOM_META[bloomLevel].hue }}
                        aria-hidden
                      />
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold">{bloomLevel}</p>
                        <p className="text-[11px] leading-relaxed text-muted-foreground">
                          {BLOOM_META[bloomLevel].blurb}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Question Settings panel */}
              <div className="space-y-2">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Question Settings</h3>
                </div>

                <Card className="brutal-block space-y-3 p-3.5">
                  {/* MCQ toggle */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-0.5">
                      <label htmlFor="mcq-only-toggle" className="text-xs font-bold">
                        Multiple-choice only
                      </label>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        When active, every generated item includes 4 options and a correct key.
                      </p>
                    </div>
                    <Switch
                      id="mcq-only-toggle"
                      checked={mcqOnly}
                      onCheckedChange={setMcqOnly}
                      aria-label="Generate multiple-choice questions only"
                    />
                  </div>

                  {/* Question count */}
                  <div className="space-y-2 border-t border-border/40 pt-3">
                    <div className="flex items-center justify-between">
                      <label htmlFor="question-count-slider" className="text-xs font-bold">
                        Number of questions
                      </label>
                      <DataChip tone="emerald">{questionCount}</DataChip>
                    </div>
                    <Slider
                      id="question-count-slider"
                      value={[questionCount]}
                      onValueChange={([v]) => setQuestionCount(v)}
                      min={1}
                      max={20}
                      step={1}
                      aria-label="Number of questions to generate"
                    />
                    <div className="flex justify-between text-[9px] font-mono uppercase tracking-wider text-muted-foreground">
                      <span>1</span>
                      <span>20</span>
                    </div>
                  </div>
                </Card>
              </div>
            </>
          )}
        </div>
      </div>
    </StageFrame>
  )
}

interface StatsData {
  runs: {
    total: number
    completed: number
    failed: number
    running: number
    successRate: number
    averageDurationMs: number | null
    byBloomLevel: Record<string, number>
  }
  agents: number
  providers: number
}

function DashboardStats() {
  const [stats, setStats] = React.useState<StatsData | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    fetch('/api/stats')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg border border-border/30 bg-muted/5 animate-pulse">
        <Loader2 className="size-4 animate-spin text-muted-foreground/60" />
      </div>
    )
  }

  if (!stats) return null

  const formatDuration = (ms: number | null) => {
    if (ms === null) return 'N/A'
    const sec = Math.round(ms / 1000)
    return `${sec}s`
  }

  return (
    <div className="space-y-3 pt-2">
      <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
        Workspace Dashboard Metrics
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {/* Total Runs Card */}
        <Card className="p-2.5 bg-muted/10 border-border/30 space-y-1 rounded-xl">
          <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wide">Total Runs</div>
          <div className="text-base font-black leading-none">{stats.runs.total}</div>
        </Card>

        {/* Success Rate Card */}
        <Card className="p-2.5 bg-muted/10 border-border/30 space-y-1 rounded-xl">
          <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wide">Success Rate</div>
          <div className="text-base font-black leading-none text-emerald-500">
            {Math.round(stats.runs.successRate * 100)}%
          </div>
        </Card>

        {/* Avg Duration Card */}
        <Card className="p-2.5 bg-muted/10 border-border/30 space-y-1 rounded-xl">
          <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wide">Avg Duration</div>
          <div className="text-base font-black leading-none">
            {formatDuration(stats.runs.averageDurationMs)}
          </div>
        </Card>

        {/* Custom Agents Card */}
        <Card className="p-2.5 bg-muted/10 border-border/30 space-y-1 rounded-xl">
          <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-wide">Saved Agents</div>
          <div className="text-base font-black leading-none text-primary">
            {stats.agents}
          </div>
        </Card>
      </div>
    </div>
  )
}
