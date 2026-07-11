'use client'

/**
 * AgentThinkingConsole — a Z.ai-console-style "agent thinking" panel.
 *
 * Renders a terminal where you watch the agent's reasoning stream in
 * character-by-character with a blinking caret, scanline glow, and live
 * metrics. Each agent has a scripted sequence of plausible reasoning
 * steps; once those are exhausted the console keeps streaming real log
 * lines from the pipeline store so it stays alive during the actual
 * model call.
 *
 * Used by the four agent stages (Extraction / Generation / Answering /
 * Verification) in place of the plain RunningShimmer.
 */

import * as React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { ScanEye, Sparkles, PenLine, ShieldCheck } from 'lucide-react'
import { usePipelineStore } from '@/lib/store'
import type { StageId } from '@/lib/types'
import { cn } from '@/lib/utils'
import { ShaderIcon } from '@/components/shader-icons'

/* ------------------------------------------------------------------ */
/* Per-agent config                                                    */
/* ------------------------------------------------------------------ */

type Accent = 'emerald' | 'amber' | 'teal' | 'coral'

interface AgentConfig {
  agent: string
  accent: Accent
  icon: LucideIcon
  /** Plausible reasoning steps the agent works through, streamed in order. */
  thoughts: string[]
}

const CONFIG: Record<StageId, AgentConfig> = {
  upload: {
    agent: 'Ingest',
    accent: 'emerald',
    icon: ScanEye,
    thoughts: ['reading file bytes…', 'validating mime type…'],
  },
  extraction: {
    agent: 'Vision Agent',
    accent: 'emerald',
    icon: ScanEye,
    thoughts: [
      'loading diagram into vision context…',
      'segmenting visual regions…',
      'detecting labeled nodes & glyphs…',
      'resolving directed edges…',
      'classifying diagram type…',
      'computing spatial layout…',
      'structuring entity graph…',
      'emitting ExtractionOutput JSON…',
    ],
  },
  generation: {
    agent: 'Generator Agent',
    accent: 'amber',
    icon: Sparkles,
    thoughts: [
      'loading extraction context…',
      'conditioning on Bloom level…',
      'selecting target entities…',
      'drafting question 1…',
      'checking answer-leakage…',
      'drafting question 2…',
      'verifying cognitive demand…',
      'drafting question 3 & 4…',
      'emitting GeneratedQuestion[]…',
    ],
  },
  answering: {
    agent: 'Solver Agent',
    accent: 'teal',
    icon: PenLine,
    thoughts: [
      'reading question (no access to intended answers)…',
      'scanning diagram structure…',
      'locating referenced entities…',
      'tracing relationships…',
      'composing grounded answer…',
      'citing supporting structure…',
      'estimating confidence…',
      'emitting GeneratedAnswer[]…',
    ],
  },
  verification: {
    agent: 'Critic Agent',
    accent: 'coral',
    icon: ShieldCheck,
    thoughts: [
      'loading Q&A pair…',
      'checking answer correctness vs diagram…',
      'scanning for ambiguity…',
      'detecting answer-leakage in question…',
      'validating Bloom difficulty label…',
      'assigning verdict…',
      'emitting VerificationVerdict[]…',
    ],
  },
  results: {
    agent: 'Curator',
    accent: 'emerald',
    icon: ShieldCheck,
    thoughts: ['curating verified set…', 'scoring & sorting…'],
  },
}

const ACCENT_HEX: Record<Accent, string> = {
  emerald: '#34d399',
  amber: '#fbbf24',
  teal: '#2dd4bf',
  coral: '#fb7185',
}

/* ------------------------------------------------------------------ */
/* Typewriter hook                                                     */
/* ------------------------------------------------------------------ */

/** Streams `text` out one character at a time. Returns the visible slice. */
function useTypewriter(text: string, speed = 22, enabled = true) {
  const [count, setCount] = React.useState(0)
  React.useEffect(() => {
    setCount(0)
    if (!enabled) {
      setCount(text.length)
      return
    }
    let i = 0
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      i += 1
      setCount(i)
      if (i < text.length) {
        // slight jitter for a human feel
        const jitter = Math.random() * 14
        timer = setTimeout(tick, speed + jitter)
      }
    }
    timer = setTimeout(tick, speed)
    return () => clearTimeout(timer)
  }, [text, speed, enabled])
  return text.slice(0, count)
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function AgentThinkingConsole({
  stageId,
  label,
  className,
}: {
  stageId: StageId
  /** Optional override for the leading status label. */
  label?: string
  className?: string
}) {
  const reduce = useReducedMotion()
  const cfg = CONFIG[stageId]
  const Icon = cfg.icon
  const accent = ACCENT_HEX[cfg.accent]

  // Live logs from the store. Once a real reasoning line for this stage
  // arrives, we stop the scripted placeholder animation and switch to
  // showing genuine model output — the scripted lines were only ever a
  // "warming up" placeholder for the gap before the first real token.
  const logs = usePipelineStore((s) => s.logs)
  const liveLines = React.useMemo(
    () =>
      logs
        .filter((l) => l.stage === stageId && !l.text.startsWith('[provider]'))
        .map((l) => l.text),
    [logs, stageId]
  )
  const hasRealReasoning = liveLines.length > 0

  // which scripted thought we're on (only advances while no real data yet)
  const [thoughtIdx, setThoughtIdx] = React.useState(0)
  const scriptedDone = hasRealReasoning || thoughtIdx >= cfg.thoughts.length

  // typewriter for the current scripted thought
  const currentThought = cfg.thoughts[thoughtIdx] ?? ''
  const typed = useTypewriter(currentThought, 22, !reduce && !hasRealReasoning)

  // advance to the next thought a beat after the current finishes typing
  React.useEffect(() => {
    if (scriptedDone) return
    if (typed.length < currentThought.length) return
    const t = setTimeout(() => setThoughtIdx((i) => i + 1), 360)
    return () => clearTimeout(t)
  }, [typed, currentThought, scriptedDone])

  // auto-scroll the body to the bottom as content grows
  const bodyRef = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    const el = bodyRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [typed, thoughtIdx, liveLines.length])

  // faux live metrics that tick up while thinking
  const [tokens, setTokens] = React.useState(0)
  const [elapsed, setElapsed] = React.useState(0)
  const startTime = React.useRef<number | null>(null)
  React.useEffect(() => {
    startTime.current = Date.now()
    const id = setInterval(() => {
      setTokens((t) => t + Math.floor(Math.random() * 90) + 30)
      if (startTime.current) {
        setElapsed((Date.now() - startTime.current) / 1000)
      }
    }, 420)
    return () => clearInterval(id)
  }, [stageId])

  // build the rendered line list
  const doneThoughts = cfg.thoughts.slice(0, thoughtIdx)

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'relative overflow-hidden rounded-2xl',
        className
      )}
      style={{
        background: 'rgba(10,10,10,0.94)',
        border: '2px solid rgba(255,255,255,0.1)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
      }}
      role="status"
      aria-live="polite"
      aria-label={`${cfg.agent} thinking`}
    >
      {/* ---- Header ---- */}
      <div className="relative flex items-center justify-between gap-3 border-b border-white/10 px-5 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="flex size-7 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: accent }}
          >
            <ShaderIcon icon={Icon} size={15} colorTint="#0a0a0a" speed={0.5} />
          </span>
          <div className="min-w-0 leading-tight">
            <div className="flex items-center gap-2">
              <span className="truncate text-[13px] font-black uppercase text-white">
                {cfg.agent}
              </span>
              <span
                className="hidden font-mono text-[10px] font-bold uppercase tracking-wider sm:inline"
                style={{ color: accent }}
              >
                thinking
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span
                className="thinking-dot size-1.5 rounded-full"
                style={{ backgroundColor: accent, animationDelay: '0ms' }}
              />
              <span
                className="thinking-dot size-1.5 rounded-full"
                style={{ backgroundColor: accent, animationDelay: '160ms' }}
              />
              <span
                className="thinking-dot size-1.5 rounded-full"
                style={{ backgroundColor: accent, animationDelay: '320ms' }}
              />
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3 font-mono text-[10px] font-bold text-white/60">
          <span>
            ctx <span style={{ color: accent }}>{(tokens / 1000).toFixed(1)}k</span>
          </span>
          <span className="hidden sm:inline">
            <span style={{ color: accent }}>{elapsed.toFixed(1)}s</span>
          </span>
          <span className="flex items-center gap-1">
            <span
              className="inline-block size-2 rounded-full"
              style={{ backgroundColor: accent }}
            />
            <span style={{ color: accent }}>live</span>
          </span>
        </div>
      </div>

      {/* ---- Body: streaming thoughts ---- */}
      <div
        ref={bodyRef}
        className="scroll-slim relative max-h-72 min-h-40 overflow-y-auto px-5 py-4 font-mono text-[12.5px] leading-relaxed"
      >
        {/* window chrome dots */}
        <div className="pointer-events-none absolute right-4 top-3.5 flex gap-1.5">
          <span className="size-1.5 rounded-full bg-rose-500/80" />
          <span className="size-1.5 rounded-full bg-amber-500/80" />
          <span className="size-1.5 rounded-full bg-emerald-500/80" />
        </div>

        <div className="space-y-1.5">
          {hasRealReasoning ? (
            // Real model reasoning is available for this stage — show only
            // genuine content, no scripted placeholder lines.
            liveLines.map((t, i) => (
              <ThoughtLine key={`l-${i}`} text={t} accent={accent} done />
            ))
          ) : (
            <>
              {/* scripted placeholder thoughts, shown only until real data arrives */}
              {doneThoughts.map((t, i) => (
                <ThoughtLine key={`d-${i}`} text={t} accent={accent} done />
              ))}
              {!scriptedDone && <ThoughtLine text={typed} accent={accent} typing />}
            </>
          )}

          {/* idle trailing prompt once everything is streamed but stage still running */}
          {scriptedDone && (
            <div className="flex items-center gap-2 pt-0.5 text-white/40">
              <span style={{ color: accent }}>›</span>
              <span className="thinking-caret" style={{ backgroundColor: accent }} />
              <span className="text-[11px]">awaiting model response…</span>
            </div>
          )}
        </div>
      </div>

      {/* ---- Footer: status bar ---- */}
      <div className="relative flex items-center justify-between gap-3 border-t border-white/10 px-5 py-2.5 font-mono text-[10px] font-bold text-white/60">
        <span className="truncate">
          {label ?? (scriptedDone ? 'streaming live output' : 'reasoning in progress')}
        </span>
        {/* scanning progress bar */}
        <div className="relative h-1.5 w-28 overflow-hidden rounded-full border border-white/20 bg-white/5">
          <div
            className="absolute inset-y-0 w-1/2"
            style={{
              backgroundColor: accent,
              animation: reduce ? undefined : 'thinking-scan 1.8s linear infinite',
            }}
          />
        </div>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* A single streamed line                                              */
/* ------------------------------------------------------------------ */

function ThoughtLine({
  text,
  accent,
  done,
  typing,
}: {
  text: string
  accent: string
  done?: boolean
  typing?: boolean
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-px shrink-0 select-none" style={{ color: accent }}>
        {done ? '✓' : '›'}
      </span>
      <span className="min-w-0 flex-1 break-words text-white/85">
        {text}
        {typing && (
          <span
            className="thinking-caret ml-px align-baseline"
            style={{ backgroundColor: accent }}
            aria-hidden
          />
        )}
      </span>
    </div>
  )
}

export default AgentThinkingConsole
