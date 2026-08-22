'use client'

/**
 * UploadStage — the cockpit.
 *
 * REBUILT. The previous version was a single full-bleed column: one
 * very wide, very flat SOURCE FILE box across the top, the three
 * instruments shoved to the bottom of the viewport with `mt-auto`, and
 * whatever height was left over sitting empty between them. On a
 * laptop that was a hand's width of dead graph paper down the middle
 * of the most important screen in the product, with heavy 3px rules
 * boxing every region and a solid black launch slab underneath.
 *
 * Three things fixed it, none of which required abandoning the system:
 *
 *   1. TWO COLUMNS, NOT ONE. The source bay is tall and narrow-ish so
 *      the drop target can be roughly the shape of an actual diagram
 *      (4:3) instead of a letterbox; the three instruments stack in
 *      the other column. Both columns are `min-h-0` flex children of
 *      the same row, so they consume the height instead of leaving it.
 *   2. NO `mt-auto`. Nothing is pushed anywhere. Height is distributed,
 *      not abandoned.
 *   3. WEIGHT BUDGET. One heavy rule per screen region, not per box.
 *      Panels are 2px on a soft corner; the black launch slab is now
 *      paper with a single top rule, so the only pure-ink object left
 *      on the page is the button you are meant to press.
 *
 * The column contract is unchanged:
 *
 *   MASTHEAD  pinned. Stage number, title, live readout.
 *   DECK      the only scrolling region: source bay + instruments.
 *   LAUNCH    pinned to the bottom. Checklist + the CTA, always reachable.
 *
 * THE DEMO CONTRACT
 * -----------------
 * The sample diagram ALWAYS runs, with or without an API key, because it
 * is replayed locally by `lib/demo-run` rather than sent to a provider.
 * The standalone "no key?" promo panel is gone — the capability now lives
 * as a secondary action in the launch bar, where every other run control
 * already is.
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
  Loader2,
  Check,
  AlertTriangle,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { usePipelineStore } from '@/lib/store'
import { BLOOM_META } from '@/lib/bloom'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Lens } from '@/components/ui/lens'
import { BloomWheel } from './BloomWheel'
import { ProviderSelect, useProviderOptions } from '@/components/provider-select'
import {
  SAMPLE_DIAGRAM_NAME,
  cancelDemoRun,
  newDemoRunId,
  runDemoPipeline,
  sampleDiagramDataUrl,
} from '@/lib/demo-run'

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
function rasteriseIfNeeded(
  dataUrl: string,
  filename: string,
): Promise<{ dataUrl: string; name: string }> {
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
// 4.5MB request-body ceiling enforced by the platform itself.
const MAX_BYTES = 2.5 * 1024 * 1024 // 2.5 MB

/* ------------------------------------------------------------------ */
/* Small RUBRIC primitives, local to this page                         */
/* ------------------------------------------------------------------ */

/** A monospace section tag. Everything is labelled — structure rule 5. */
function Tag({
  children,
  tone = 'ink',
  className,
}: {
  children: React.ReactNode
  tone?: 'ink' | 'red' | 'accent' | 'muted'
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-block rounded-[var(--r-xs)] border-[1.5px] border-[var(--line)] px-2 py-[3px]',
        'font-mono text-[10px] font-bold uppercase leading-none tracking-[0.16em]',
        tone === 'red' && 'bg-[var(--red)] text-white',
        tone === 'ink' && 'bg-[var(--ink)] text-[var(--paper)]',
        tone === 'accent' && 'bg-[var(--yellow)] text-[#0a0a0a]',
        tone === 'muted' && 'border-[var(--line)]/40 bg-transparent text-[var(--ink-2)]',
        className,
      )}
    >
      {children}
    </span>
  )
}

/**
 * A titled instrument.
 *
 * The old version shared its borders with its neighbours via negative
 * margins, which is correct brutalism and wrong here: four panels
 * welded edge to edge with 3px of ink between them read as a single
 * dense table, and the eye has nowhere to rest. These are separate
 * objects with air between them, ruled at 2px on a soft corner. The
 * index is set as an outlined numeral so it labels the panel without
 * competing with the panel's own title.
 */
function Instrument({
  index,
  title,
  hint,
  children,
  className,
  bodyClassName,
}: {
  index: string
  title: string
  hint?: string
  children: React.ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section
      className={cn(
        'glass-surface flex min-w-0 flex-col overflow-hidden border-2 border-[var(--line)]',
        className,
      )}
    >
      <header className="flex shrink-0 items-center gap-2.5 border-b-2 border-[var(--line)]/20 px-4 py-2.5">
        <span
          className="font-[family-name:var(--font-archivo)] text-[17px] font-black leading-none text-transparent"
          style={{ WebkitTextStroke: '1.5px var(--red)', paintOrder: 'stroke fill' }}
          aria-hidden
        >
          {index}
        </span>
        <h2 className="font-[family-name:var(--font-archivo)] text-[12px] font-black uppercase leading-none tracking-[0.06em]">
          {title}
        </h2>
        {hint && (
          <p className="ml-auto hidden min-w-0 max-w-[46ch] truncate text-right text-[10.5px] leading-none text-[var(--ink-2)] xl:block">
            {hint}
          </p>
        )}
      </header>
      {hint && (
        <p className="shrink-0 px-4 pt-2.5 text-[11px] leading-snug text-[var(--ink-2)] xl:hidden">
          {hint}
        </p>
      )}
      <div className={cn('min-h-0 flex-1 p-4', bodyClassName)}>{children}</div>
    </section>
  )
}

/** One line of the pre-flight checklist in the launch bar. */
function CheckLine({
  ok,
  label,
  value,
}: {
  ok: boolean
  label: string
  value: string
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span
        className={cn(
          'flex size-[17px] shrink-0 items-center justify-center rounded-[4px] border-[1.5px]',
          ok
            ? 'border-[var(--line)] bg-[var(--bloom-3)] text-[#0a0a0a]'
            : 'border-[var(--line)]/35 bg-transparent text-[var(--ink-2)]',
        )}
        aria-hidden
      >
        {ok ? <Check className="size-3" strokeWidth={3.5} /> : <X className="size-3" strokeWidth={3.5} />}
      </span>
      <span className="min-w-0 font-mono text-[10px] uppercase leading-tight tracking-[0.12em]">
        <span className="text-[var(--ink-2)]">{label} </span>
        <span className={cn('font-bold', ok ? 'text-[var(--ink)]' : 'text-[var(--red)]')}>
          {value}
        </span>
      </span>
    </div>
  )
}

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
    /** True for the built-in sample, which always runs as a scripted demo. */
    isSample?: boolean
  } | null>(null)
  const [dragOver, setDragOver] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  // The "no API key" notice is deferred: it only appears once the user has
  // actually tried to launch a real run. Leading with a warning about
  // something nobody has attempted yet is the wrong first impression.
  const [keyWarning, setKeyWarning] = React.useState(false)

  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const { providers, loading: loadingProviders } = useProviderOptions()
  const hasUsableProvider = React.useMemo(() => {
    if (loadingProviders) return true
    if (selectedProvider) {
      const selected = providers.find((p) => p.id === selectedProvider)
      // Coerced, not just truthy-checked: `supportsVision` is optional on
      // the provider row, so the `&&` chain returns `boolean | undefined`
      // and every consumer expecting a plain boolean fails to typecheck.
      return !!(
        selected &&
        selected.usable &&
        (selected.isCustom || selected.supportsVision)
      )
    }
    return providers.some((p) => !p.isCustom && p.usable && p.supportsVision)
  }, [providers, loadingProviders, selectedProvider])

  const hasRunDiagram = !!diagramDataUrl
  const previewName = hasRunDiagram ? diagramFilename : uploadedFile?.name
  const previewUrl = hasRunDiagram ? diagramDataUrl : uploadedFile?.dataUrl
  const isSample = !!uploadedFile?.isSample

  /* ---- file intake ---- */
  const handleFile = React.useCallback((file: File) => {
    const ok = /\.(png|jpe?g|webp|svg)$/i.test(file.name)
    if (!ok) {
      toast.error('Unsupported file type', {
        description: 'Use PNG, JPG, WebP or SVG.',
      })
      return
    }
    if (file.size > MAX_BYTES) {
      toast.error('File too large', { description: 'Please use a file under 2.5 MB.' })
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result
      if (typeof dataUrl !== 'string') return
      setUploadedFile({ name: file.name, dataUrl })
      setKeyWarning(false)
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
    setUploadedFile({
      name: SAMPLE_DIAGRAM_NAME,
      dataUrl: sampleDiagramDataUrl(),
      isSample: true,
    })
    setKeyWarning(false)
  }

  /* ---- the scripted demo run ---- */
  const startDemo = React.useCallback(
    (file: { name: string; dataUrl: string }) => {
      const runId = newDemoRunId()

      setRunId(runId)
      setDiagram(file.name, file.dataUrl)
      startRun()
      setUploadedFile(null)
      setKeyWarning(false)

      toast.success('Demo run started', {
        description: 'Scripted offline run — no API key or model call involved.',
      })

      // Deliberately not awaited. `setDiagram` moves the active stage to
      // 'extraction', which unmounts this component immediately; the replay
      // is owned by lib/demo-run and drives the store on its own.
      const { applyStageEvent, appendLog } = usePipelineStore.getState()
      void runDemoPipeline({
        runId,
        bloomLevel,
        questionCount,
        mcqOnly,
        onStage: applyStageEvent,
        onLog: appendLog,
      })
    },
    [bloomLevel, questionCount, mcqOnly, setDiagram, setRunId, startRun],
  )

  /* ---- run ---- */
  const runPipeline = async () => {
    const file = uploadedFile
    if (!file || submitting || running) return

    // The sample never touches the network — it always replays locally.
    if (file.isSample) {
      startDemo(file)
      return
    }

    if (!hasUsableProvider) {
      setKeyWarning(true)
      toast.error('No vision-capable API key', {
        description: 'Add one in Settings, or try the sample diagram — it always runs.',
      })
      return
    }

    setSubmitting(true)
    setKeyWarning(false)
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

      setRunId(runId)
      setDiagram(sendName, sendDataUrl)
      startRun()
      setUploadedFile(null)

      toast.success('Pipeline started', {
        description: `Run ${runId.slice(0, 8)} · ${bloomLevel} · ${questionCount} question${
          questionCount === 1 ? '' : 's'
        }${mcqOnly ? ' (MCQ)' : ''}`,
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
    cancelDemoRun()
    resetRun()
    setUploadedFile(null)
    setKeyWarning(false)
  }

  const meta = BLOOM_META[bloomLevel]
  const providerLabel = loadingProviders
    ? 'checking…'
    : hasUsableProvider
    ? selectedProvider ?? 'automatic'
    : 'none configured'

  /** One entrance recipe, staggered by section. Same object shape in both
   *  motion branches so the spread stays a single, well-typed value. */
  const rise = (delay: number) => ({
    initial: reduce ? (false as const) : { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: reduce
      ? { duration: 0 }
      : {
          duration: 0.42,
          delay,
          ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
        },
  })

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* ============================== MASTHEAD ==============================
          One rule under it, nothing else. The stage index is an outlined
          numeral rather than a filled red chip: it says "one of six"
          without being the loudest thing on the screen. */}
      <motion.header
        {...rise(0)}
        className="flex shrink-0 flex-col gap-3 border-b-2 border-[var(--line)] bg-[var(--card)] px-5 py-3 md:flex-row md:items-center md:justify-between md:px-8"
      >
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex shrink-0 items-baseline gap-1.5" aria-label="Stage 1 of 6">
            <span
              className="font-[family-name:var(--font-archivo)] text-[34px] font-black leading-none text-transparent"
              style={{ WebkitTextStroke: '2px var(--red)', paintOrder: 'stroke fill' }}
              aria-hidden
            >
              01
            </span>
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--ink-2)]" aria-hidden>
              /06
            </span>
          </div>
          <span className="hidden h-9 w-[2px] shrink-0 rounded-none bg-[var(--line)]/20 md:block" aria-hidden />
          <div className="min-w-0">
            <h1 className="font-[family-name:var(--font-archivo)] text-xl font-black uppercase leading-none tracking-[-0.03em] md:text-[26px]">
              Source diagram
            </h1>
            <p className="mt-1.5 truncate text-[11.5px] leading-none text-[var(--ink-2)]">
              <span className="font-bold text-[var(--ink)]">Ingest</span> · six agents read
              the diagram, write questions, answer them blind, and mark their own work.
            </p>
          </div>
        </div>

        {/* live readout */}
        <dl className="grid shrink-0 grid-cols-2 overflow-hidden rounded-[var(--r-s)] border-[1.5px] border-[var(--line)]/45 sm:grid-cols-4">
          {[
            { k: 'Source', v: previewName ?? '—', accent: !!previewName },
            { k: 'Level', v: bloomLevel, accent: true },
            { k: 'Items', v: `${questionCount}${mcqOnly ? '·mcq' : ''}`, accent: true },
            { k: 'Host', v: providerLabel, accent: hasUsableProvider },
          ].map((r) => (
            <div
              key={r.k}
              className={cn(
                'min-w-[92px] max-w-[168px] rounded-none border-[var(--line)]/25 px-2.5 py-1',
                '[&:nth-child(odd)]:border-r-[1.5px] [&:nth-child(n+3)]:border-t-[1.5px]',
                'sm:[&:nth-child(odd)]:border-r-0 sm:[&:nth-child(n+3)]:border-t-0 sm:[&:not(:first-child)]:border-l-[1.5px]',
              )}
            >
              <dt className="font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-[var(--ink-2)]">
                {r.k}
              </dt>
              <dd
                className={cn(
                  'dat truncate text-[11px] font-bold leading-tight',
                  r.accent ? 'text-[var(--ink)]' : 'text-[var(--ink-2)]',
                )}
                title={r.v}
              >
                {r.v}
              </dd>
            </div>
          ))}
        </dl>
      </motion.header>

      {/* ============================== DECK ============================== */}
      <div className="scroll-slim flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-4 md:px-8">
        {hasRunDiagram ? (
          /* ---------- post-launch: the run is registered ---------- */
          /* The registered-run panel used to be a `max-w-[1100px]` card
             sitting at the top of an otherwise empty deck: a small box
             marooned in three-quarters of a screen of graph paper, with
             the diagram — the one thing worth looking at here — printed
             at thumbnail size inside it. It now takes the deck's full
             height and width, and the preview gets every pixel that is
             left after the configuration column. */
          <motion.section
            {...rise(0.04)}
            className="glass-surface clip flex min-h-0 w-full flex-1 flex-col border-2 border-[var(--line)] shadow-[3px_3px_0_var(--line)]"
          >
            <header className="flex shrink-0 flex-wrap items-center gap-3 border-b-2 border-[var(--line)]/20 px-4 py-3">
              <span
                className={cn(
                  'size-2.5 rounded-full',
                  running ? 'animate-pulse bg-[var(--red)]' : 'bg-[var(--bloom-3)]',
                )}
                aria-hidden
              />
              <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.18em]">
                {running ? 'Pipeline running' : 'Pipeline registered'}
              </h2>
              <span className="ml-auto truncate font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-2)]">
                {previewName}
              </span>
            </header>

            <div className="grid min-h-0 flex-1 gap-0 md:grid-cols-[minmax(0,1fr)_290px]">
              <div className="grid-faint flex min-h-0 items-center justify-center p-6">
                {previewUrl?.startsWith('data:application/pdf') ? (
                  <div className="flex h-52 flex-col items-center justify-center gap-2 text-[var(--ink-2)]">
                    <FileText className="size-12" />
                    <span className="font-mono text-xs uppercase tracking-widest">PDF source</span>
                  </div>
                ) : (
                  /* Fill the bay, keep the ratio. `object-contain` on a
                     box that is itself 100%×100% of the cell scales the
                     diagram up to whichever of width or height runs out
                     first and stops — so it is as large as it can be
                     without ever being cropped or stretched. The old
                     `w-auto` + `max-h` pair capped it at the image's own
                     intrinsic size, which is why a 1360×680 export sat
                     small in the middle of a half-empty panel. */
                  <Lens lensSize={380} zoomFactor={2.1} className="flex h-full w-full items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl ?? ''}
                      alt={previewName ?? 'Diagram preview'}
                      className="h-full max-h-full w-full max-w-full rounded-[var(--r-s)] border-[1.5px] border-[var(--line)]/50 bg-[var(--surface)] object-contain"
                    />
                  </Lens>
                )}
              </div>

              <div className="flex min-h-0 flex-col gap-4 overflow-y-auto border-t-2 border-[var(--line)]/20 p-5 md:border-l-2 md:border-t-0">
                <div>
                  <div className="fig-label">Configuration</div>
                  <dl className="mt-3 space-y-2">
                    {[
                      ['Bloom level', bloomLevel],
                      ['Questions', String(questionCount)],
                      ['Format', mcqOnly ? 'Multiple choice' : 'Short answer'],
                    ].map(([k, v]) => (
                      <div
                        key={k}
                        className="flex items-baseline justify-between gap-3 border-b-2 border-dashed border-[var(--line)]/25 pb-2"
                      >
                        <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-2)]">
                          {k}
                        </dt>
                        <dd className="dat text-[12px] font-bold">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <p className="text-[11px] leading-relaxed text-[var(--ink-2)]">
                  Follow the agents in the left rail, or open the log to watch
                  their reasoning as it streams.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  disabled={running}
                  className="mt-auto w-full"
                >
                  <RotateCcw className="size-3.5" />
                  Reset stage
                </Button>
              </div>
            </div>
          </motion.section>
        ) : (
          /* ---------- pre-launch: two columns, no dead middle ----------
             Left column is the source and is allowed to be the tall one,
             because a drop target the shape of a diagram is the whole
             point of the screen. Right column carries the three settings
             instruments. Both stretch, so the deck is never a band of
             content floating above an empty half. */
          <motion.div
            {...rise(0.04)}
            /* `items-stretch`, not `content-start`. Starting the content
               at the top left every spare pixel pooled in one band of
               empty graph paper along the bottom of the screen — the
               same failure as the old `mt-auto`, just at the other end.
               Both columns now consume the height they are given, so the
               drop target grows into the space instead of a void
               opening under it. */
            className="grid min-h-0 flex-1 items-stretch gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]"
          >
            {/* ================= A · SOURCE ================= */}
            <section className="glass-surface flex min-h-0 min-w-0 flex-col overflow-hidden border-2 border-[var(--line)] shadow-[4px_4px_0_var(--line)]">
              <header className="flex shrink-0 items-center gap-2.5 border-b-2 border-[var(--line)]/20 px-4 py-2.5">
                <span
                  className="font-[family-name:var(--font-archivo)] text-[17px] font-black leading-none text-transparent"
                  style={{ WebkitTextStroke: '1.5px var(--red)', paintOrder: 'stroke fill' }}
                  aria-hidden
                >
                  A
                </span>
                <h2 className="font-[family-name:var(--font-archivo)] text-[12px] font-black uppercase leading-none tracking-[0.06em]">
                  Source file
                </h2>
                <button
                  type="button"
                  onClick={loadSample}
                  disabled={isSample}
                  className="link-ink ml-auto font-mono text-[10px] font-bold uppercase tracking-[0.14em] disabled:pointer-events-none disabled:bg-none disabled:opacity-40"
                >
                  {isSample ? 'sample loaded' : 'load sample'}
                </button>
              </header>

              <AnimatePresence mode="wait" initial={false}>
                {previewUrl ? (
                  <motion.div
                    key="preview"
                    initial={reduce ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={reduce ? undefined : { opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex min-h-0 flex-1 flex-col"
                  >
                    <div className="glass-inner flex min-h-0 flex-1 items-center justify-center p-4">
                      <Lens lensSize={260} zoomFactor={2}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={previewUrl}
                          alt={previewName ?? 'Diagram preview'}
                          className="max-h-[46vh] w-auto max-w-full rounded-[var(--r-s)] border-[1.5px] border-[var(--line)]/50 bg-[var(--surface)] object-contain"
                        />
                      </Lens>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-3 border-t-2 border-[var(--line)]/20 px-4 py-2.5">
                      {isSample ? <Tag tone="red">Demo specimen</Tag> : <Tag tone="accent">Loaded</Tag>}
                      <span className="dat min-w-0 flex-1 truncate text-[12px] font-bold">
                        {previewName}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadedFile(null)
                          setKeyWarning(false)
                        }}
                        className="link-ink font-mono text-[10px] font-bold uppercase tracking-[0.14em]"
                      >
                        Clear
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="dropzone"
                    initial={reduce ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={reduce ? undefined : { opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex min-h-0 flex-1 flex-col p-3"
                  >
                    {/* A drop target shaped like the thing you drop on it.
                        The old one was a full-width letterbox, which is
                        the one shape a diagram is never in. */}
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
                        'group flex min-h-[240px] w-full flex-1 flex-col items-center justify-center gap-4 rounded-[var(--r-s)] border-2 border-dashed px-6 py-8 text-center',
                        'transition-[background-color,border-color] duration-[90ms] ease-[cubic-bezier(.2,0,0,1)]',
                        dragOver
                          ? 'border-[var(--red)] bg-[color-mix(in_srgb,var(--red)_8%,transparent)]'
                          : 'border-[var(--line)]/35 bg-transparent hover:border-[var(--line)]/70 hover:bg-[var(--paper)]',
                      )}
                    >
                      <span
                        className={cn(
                          'flex size-14 shrink-0 items-center justify-center rounded-[var(--r-s)] border-2 border-[var(--line)] transition-[transform,box-shadow,background-color] duration-[90ms]',
                          dragOver
                            ? 'translate-x-[4px] translate-y-[4px] bg-[var(--red)] text-white shadow-none'
                            : 'bg-[var(--yellow)] text-[#0a0a0a] shadow-[4px_4px_0_var(--line)] group-hover:-translate-x-[2px] group-hover:-translate-y-[2px] group-hover:shadow-[6px_6px_0_var(--line)]',
                        )}
                      >
                        <Upload className="size-6" strokeWidth={2.5} />
                      </span>
                      <span>
                        <span className="block font-[family-name:var(--font-archivo)] text-[19px] font-black uppercase leading-none tracking-[-0.02em]">
                          {dragOver ? 'Release to ingest' : 'Drop a diagram'}
                        </span>
                        <span className="mt-2 block font-mono text-[10px] uppercase leading-relaxed tracking-[0.14em] text-[var(--ink-2)]">
                          or click to browse
                          <br />
                          png · jpg · webp · svg · ≤ 2.5 mb
                        </span>
                      </span>
                      <span className="marginalia !text-[15px]">or try the sample →</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ACCEPTED}
                      onChange={onPick}
                      className="sr-only"
                      aria-hidden
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {/* ================= B / C / D · SETTINGS ================= */}
            <div className="flex min-h-0 min-w-0 flex-col gap-6">
              <Instrument
                index="B"
                title="Cognitive level"
                hint="Bloom’s taxonomy — cool to warm is low to high cognitive order."
                className="shrink-0"
              >
                <div className="flex flex-col items-center gap-5 md:flex-row md:items-center md:gap-6">
                  <div className="aspect-square w-full max-w-[248px] shrink-0">
                    <BloomWheel value={bloomLevel} onChange={setBloomLevel} />
                  </div>
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="rounded-[var(--r-xs)] border-[1.5px] border-[var(--line)] px-2 py-[3px] font-mono text-[10px] font-bold uppercase tracking-[0.14em]"
                        style={{ backgroundColor: meta.hue, color: meta.fg }}
                      >
                        {meta.level}
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-2)]">
                        verb · <span className="font-bold text-[var(--ink)]">{meta.verb}</span>
                      </span>
                    </div>
                    <p className="text-[12px] leading-relaxed text-[var(--ink-2)]">{meta.blurb}</p>
                    {/* the spectrum as a ruler — position in the taxonomy */}
                    <div className="flex overflow-hidden rounded-[var(--r-xs)] border-[1.5px] border-[var(--line)]">
                      {(Object.keys(BLOOM_META) as Array<keyof typeof BLOOM_META>).map((lvl, i) => {
                        const m = BLOOM_META[lvl]
                        const on = lvl === bloomLevel
                        return (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => setBloomLevel(lvl)}
                            title={lvl}
                            aria-label={lvl}
                            aria-pressed={on}
                            className={cn(
                              'h-6 flex-1 rounded-none transition-[opacity] duration-[90ms]',
                              i > 0 && 'border-l-[1.5px] border-[var(--line)]',
                              on ? 'opacity-100' : 'opacity-25 hover:opacity-65',
                            )}
                            style={{ backgroundColor: m.hue }}
                          />
                        )
                      })}
                    </div>
                  </div>
                </div>
              </Instrument>

              <div className="grid min-h-0 flex-1 gap-6 sm:grid-cols-2">
                <Instrument
                  index="C"
                  title="Output shape"
                  hint="How many items the generator writes, and in what format."
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <label htmlFor="mcq-only-toggle" className="block text-[12px] font-bold">
                          Multiple-choice only
                        </label>
                        <p className="text-[11px] leading-snug text-[var(--ink-2)]">
                          Every item gets 4 options and a correct key.
                        </p>
                      </div>
                      <Switch
                        id="mcq-only-toggle"
                        checked={mcqOnly}
                        onCheckedChange={setMcqOnly}
                        aria-label="Generate multiple-choice questions only"
                      />
                    </div>

                    <div className="space-y-3 border-t-2 border-dashed border-[var(--line)]/25 pt-4">
                      <div className="flex items-baseline justify-between">
                        <label htmlFor="question-count-slider" className="text-[12px] font-bold">
                          Number of questions
                        </label>
                        <span className="dat rounded-[var(--r-xs)] border-[1.5px] border-[var(--line)] bg-[var(--ink)] px-2 py-[2px] text-[12px] font-bold text-[var(--paper)]">
                          {questionCount}
                        </span>
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
                      <div className="flex justify-between font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--ink-2)]">
                        <span>1</span>
                        <span>20</span>
                      </div>
                    </div>
                  </div>
                </Instrument>

                <Instrument
                  index="D"
                  title="Model host"
                  hint="The vision + text provider that runs every stage."
                >
                  <div className="space-y-3">
                    <ProviderSelect
                      value={selectedProvider}
                      onChange={setSelectedProvider}
                      requireVision
                      className="h-10 w-full"
                    />
                    <div
                      className={cn(
                        'flex items-start gap-2 rounded-[var(--r-s)] border-[1.5px] px-3 py-2',
                        hasUsableProvider
                          ? 'border-[var(--line)]/30 text-[var(--ink-2)]'
                          : 'border-[var(--yellow)] bg-[color-mix(in_srgb,var(--yellow)_16%,transparent)] text-[var(--ink)]',
                      )}
                    >
                      {hasUsableProvider ? (
                        <Check className="mt-[1px] size-3.5 shrink-0" strokeWidth={3} />
                      ) : (
                        <AlertTriangle className="mt-[1px] size-3.5 shrink-0" strokeWidth={2.5} />
                      )}
                      <p className="text-[11px] leading-snug">
                        {loadingProviders
                          ? 'Checking configured providers…'
                          : hasUsableProvider
                          ? 'A vision-capable host is ready for your own diagrams.'
                          : 'No vision key yet — your own uploads can’t run, but the demo still can.'}
                      </p>
                    </div>
                    {!hasUsableProvider && !loadingProviders && (
                      <Link
                        href="/app/settings/api-keys"
                        className="link-ink inline-block font-mono text-[10px] font-bold uppercase tracking-[0.14em]"
                      >
                        Add an API key →
                      </Link>
                    )}
                  </div>
                </Instrument>
              </div>

              {/* ---------- LEDGER ---------- */}
              <WorkspaceLedger />
            </div>
          </motion.div>
        )}
      </div>

      {/* ============================== LAUNCH ==============================
          Paper, not a black slab. One rule at the top separates it from
          the deck; the only saturated object in the bar is the button
          you are meant to press, which is exactly where the eye should
          land when the checklist goes green. */}
      {!hasRunDiagram && (
        <motion.div
          {...rise(0.16)}
          className="shrink-0 border-t-2 border-[var(--line)] bg-[var(--card)]"
        >
          {keyWarning && !hasUsableProvider && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b-2 border-[var(--line)]/20 bg-[var(--yellow)] px-5 py-2 text-[#0a0a0a] md:px-8">
              <AlertTriangle className="size-3.5 shrink-0" strokeWidth={2.5} />
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em]">
                No vision-capable API key
              </span>
              <span className="text-[11px]">
                Add one in{' '}
                <Link href="/app/settings/api-keys" className="font-bold underline underline-offset-2">
                  Settings → API Keys
                </Link>
                , or run the sample — that one never needs a key.
              </span>
            </div>
          )}

          <div className="flex flex-col gap-3 px-5 py-3 md:flex-row md:items-center md:justify-between md:gap-6 md:px-8">
            <div className="grid min-w-0 gap-x-6 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-4">
              <CheckLine
                ok={!!uploadedFile}
                label="Source"
                value={uploadedFile ? (isSample ? 'sample' : 'ready') : 'none'}
              />
              <CheckLine ok label="Level" value={bloomLevel.toLowerCase()} />
              <CheckLine
                ok
                label="Output"
                value={`${questionCount}× ${mcqOnly ? 'mcq' : 'short'}`}
              />
              <CheckLine
                ok={isSample || hasUsableProvider}
                label="Host"
                value={isSample ? 'demo · local' : hasUsableProvider ? 'ready' : 'no key'}
              />
            </div>

            <div className="flex shrink-0 items-center gap-2.5">
              <span className="hidden whitespace-pre-line text-right font-mono text-[9px] uppercase leading-tight tracking-[0.12em] text-[var(--ink-2)] xl:block">
                {!uploadedFile
                  ? 'Load a diagram\nto arm the pipeline'
                  : isSample
                  ? 'Scripted run\nno model call'
                  : 'Six agents\n~40–90 s'}
              </span>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (submitting || running) return
                  startDemo({ name: SAMPLE_DIAGRAM_NAME, dataUrl: sampleDiagramDataUrl() })
                }}
                disabled={submitting || running}
                title="Replays a full scripted run locally — no API key needed"
              >
                <Sparkles className="size-4" />
                Sample demo
              </Button>
              <Button
                type="button"
                onClick={runPipeline}
                disabled={!uploadedFile || submitting || running}
                className="min-w-[176px]"
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
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Workspace ledger — shown only once there is history to report       */
/* ------------------------------------------------------------------ */

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

function WorkspaceLedger() {
  const [stats, setStats] = React.useState<StatsData | null>(null)

  React.useEffect(() => {
    let alive = true
    fetch('/api/stats')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (alive) setStats(data)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  // A fresh workspace has nothing to report, and four zeroes read as a
  // failure state rather than an empty one. Stay silent until there is
  // an actual run to count.
  if (!stats || stats.runs.total === 0) return null

  const dur =
    stats.runs.averageDurationMs === null
      ? '—'
      : `${Math.round(stats.runs.averageDurationMs / 1000)}s`

  const cells = [
    { k: 'Total runs', v: String(stats.runs.total) },
    { k: 'Success rate', v: `${Math.round(stats.runs.successRate * 100)}%` },
    { k: 'Avg duration', v: dur },
    { k: 'Saved agents', v: String(stats.agents) },
  ]

  return (
    <section className="mt-auto pt-1">
      <div className="fig-label mb-2">Workspace ledger</div>
      <dl className="grid grid-cols-2 overflow-hidden rounded-[var(--r)] border-2 border-[var(--line)] bg-[var(--card)] sm:grid-cols-4">
        {cells.map((c) => (
          <div
            key={c.k}
            className={cn(
              'rounded-none border-[var(--line)]/20 px-3.5 py-2.5',
              '[&:nth-child(odd)]:border-r-2 [&:nth-child(n+3)]:border-t-2',
              'sm:[&:nth-child(odd)]:border-r-0 sm:[&:nth-child(n+3)]:border-t-0 sm:[&:not(:first-child)]:border-l-2',
            )}
          >
            <dt className="font-mono text-[8.5px] font-bold uppercase tracking-[0.16em] text-[var(--ink-2)]">
              {c.k}
            </dt>
            {/* Outlined numerals. A workspace ledger is a footnote, not
                a scoreboard — hollow type keeps the figures legible at
                display size without letting four of them outweigh the
                one control on the page that actually does something. */}
            <dd
              className="dat mt-1 font-[family-name:var(--font-archivo)] text-[26px] font-black leading-none text-transparent"
              style={{ WebkitTextStroke: '1.5px var(--ink)', paintOrder: 'stroke fill' }}
            >
              {c.v}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
