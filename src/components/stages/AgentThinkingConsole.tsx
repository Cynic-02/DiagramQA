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
  emerald: '#5bb896',
  amber: '#f0b84a',
  teal: '#3ba4c7',
  coral: '#e8876f',
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

  // This stage's own status in the run. Once it leaves 'running' the
  // console freezes into a settled, read-only bubble instead of looping
  // its "awaiting model response" prompt forever — that loop only makes
  // sense while this agent is the one actually talking. A frozen console
  // is what lets several agents' consoles sit stacked on one page, each
  // one legible on its own, like scrollback in a chat thread.
  const stageState = usePipelineStore((s) => s.stages[stageId])
  const stageStatus = stageState?.status ?? 'idle'
  const frozen = stageStatus !== 'idle' && stageStatus !== 'running'

  // Live logs from the store. Once a real reasoning line for this stage
  // arrives, we stop the scripted placeholder animation and switch to
  // showing genuine model output — the scripted lines were only ever a
  // "warming up" placeholder for the gap before the first real token.
  const logs = usePipelineStore((s) => s.logs)
  const liveLines = React.useMemo(
    () =>
      logs
        .filter((l) => l.stage === stageId && !l.text.startsWith('[provider]'))
        .map((l) => ({ text: l.text, level: l.level })),
    [logs, stageId]
  )
  const hasRealReasoning = liveLines.length > 0

  // which scripted thought we're on (only advances while no real data yet)
  const [thoughtIdx, setThoughtIdx] = React.useState(0)
  const scriptedDone = hasRealReasoning || frozen || thoughtIdx >= cfg.thoughts.length

  // typewriter for the current scripted thought — disabled once frozen,
  // so a stage that finished early doesn't keep animating in the background
  // while a later stage in the feed is the one actually "live".
  const currentThought = cfg.thoughts[thoughtIdx] ?? ''
  const typed = useTypewriter(currentThought, 22, !reduce && !hasRealReasoning && !frozen)

  // advance to the next thought a beat after the current finishes typing
  React.useEffect(() => {
    if (scriptedDone) return
    if (typed.length < currentThought.length) return
    const t = setTimeout(() => setThoughtIdx((i) => i + 1), 360)
    return () => clearTimeout(t)
  }, [typed, currentThought, scriptedDone])

  // Once the stage finishes, snap straight to the end of the scripted
  // list so nothing is left mid-sentence in the frozen view.
  React.useEffect(() => {
    if (frozen) setThoughtIdx(cfg.thoughts.length)
  }, [frozen, cfg.thoughts.length])

  // auto-scroll the body to the bottom as content grows
  const bodyRef = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    const el = bodyRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [typed, thoughtIdx, liveLines.length])

  // faux live metrics that tick up while thinking, and hold still once frozen
  const [tokens, setTokens] = React.useState(0)
  const [elapsed, setElapsed] = React.useState(0)
  const startTime = React.useRef<number | null>(null)
  React.useEffect(() => {
    if (frozen) return
    startTime.current = Date.now()
    const id = setInterval(() => {
      setTokens((t) => t + Math.floor(Math.random() * 90) + 30)
      if (startTime.current) {
        setElapsed((Date.now() - startTime.current) / 1000)
      }
    }, 420)
    return () => clearInterval(id)
  }, [stageId, frozen])

  // build the rendered line list
  const doneThoughts = cfg.thoughts.slice(0, thoughtIdx)

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      /* Paper, not a terminal.
         This was a near-black rounded panel with a 50px blurred drop
         shadow and three little traffic-light dots — a macOS terminal
         screenshot dropped into the middle of a cream drafting page.
         Nothing else in the product looks remotely like it, and the
         one screen where a teacher is watching six agents work should
         not be the screen that stops looking like the product.
         It is now the same object as every other panel: card ground,
         ink rule, hard offset shadow, and the agent's Bloom hue as a
         spine down the left edge so you can tell which of the six is
         talking without reading the header. */
      className={cn(
        'glass-surface relative flex overflow-hidden border-2 border-[var(--line)] shadow-[5px_5px_0_var(--line)]',
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={`${cfg.agent} thinking`}
    >
      <span
        className="w-[6px] shrink-0 rounded-none"
        style={{ background: accent }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
      {/* ---- Header ---- */}
      <div className="relative flex items-center justify-between gap-3 border-b-2 border-[var(--line)]/20 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="flex size-7 shrink-0 items-center justify-center rounded-[var(--r-xs)] border-[1.5px] border-[var(--line)]"
            style={{ backgroundColor: accent }}
          >
            <ShaderIcon icon={Icon} size={15} colorTint="#0a0a0a" speed={0.5} />
          </span>
          <div className="min-w-0 leading-tight">
            <div className="flex items-center gap-2">
              <span className="truncate font-[family-name:var(--font-archivo)] text-[13px] font-black uppercase tracking-[0.02em]">
                {cfg.agent}
              </span>
              <span className="hidden rounded-[var(--r-xs)] border-[1.5px] border-[var(--line)]/35 px-1.5 py-[2px] font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--ink-2)] sm:inline">
                {frozen
                  ? stageStatus === 'error'
                    ? 'error'
                    : stageStatus === 'flagged'
                    ? 'flagged'
                    : 'done'
                  : 'thinking'}
              </span>
            </div>
            {frozen ? (
              <div className="mt-1 flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--ink-2)]">
                <svg viewBox="0 0 16 16" className="size-3 shrink-0" aria-hidden>
                  <path
                    d="M3 8.5L6.3 12L13 4"
                    fill="none"
                    stroke={accent}
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>settled</span>
              </div>
            ) : (
              <div className="mt-1 flex items-center gap-1">
                {[0, 160, 320].map((d) => (
                  <span
                    key={d}
                    className="thinking-dot size-1.5 rounded-full border-[1.5px] border-[var(--line)]"
                    style={{ backgroundColor: accent, animationDelay: `${d}ms` }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--ink-2)]">
          <span>
            ctx <span className="text-[var(--ink)]">{(tokens / 1000).toFixed(1)}k</span>
          </span>
          <span className="hidden sm:inline text-[var(--ink)]">{elapsed.toFixed(1)}s</span>
          <span className="flex items-center gap-1.5">
            <span
              className={cn(
                'inline-block size-2 rounded-full border-[1.5px] border-[var(--line)]',
                !frozen && !reduce && 'animate-pulse',
              )}
              style={{ backgroundColor: accent }}
            />
            <span className="text-[var(--ink)]">{frozen ? 'done' : 'live'}</span>
          </span>
        </div>
      </div>

      {/* ---- Body: streaming thoughts ---- */}
      <div
        ref={bodyRef}
        className="glass-inner scroll-slim relative max-h-72 min-h-40 overflow-y-auto px-4 py-3.5 font-mono text-[12.5px] leading-relaxed"
      >
        <div className="space-y-1.5">
          {hasRealReasoning ? (
            // Real model reasoning is available for this stage — show only
            // genuine content, no scripted placeholder lines.
            liveLines.map((l, i) => (
              <ThoughtLine key={`l-${i}`} text={l.text} level={l.level} accent={accent} done />
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

          {/* closing line once this agent has actually finished — its real
              stage message, not an endless "still waiting" prompt */}
          {frozen && stageState?.message && (
            <ThoughtLine
              text={stageState.message}
              accent={accent}
              done
              level={stageStatus === 'error' ? 'error' : stageStatus === 'flagged' ? 'warn' : 'success'}
            />
          )}

          {/* idle trailing prompt only while THIS agent is still the live one */}
          {!frozen && scriptedDone && (
            <div className="flex items-center gap-2 pt-0.5 text-[var(--ink-2)]">
              <span style={{ color: accent }}>›</span>
              <span className="thinking-caret" style={{ backgroundColor: accent }} />
              <span className="text-[11px]">awaiting model response…</span>
            </div>
          )}
        </div>
      </div>

      {/* ---- Footer: status bar ---- */}
      <div className="relative flex items-center justify-between gap-3 border-t-2 border-[var(--line)]/20 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--ink-2)]">
        <span className="truncate">
          {frozen
            ? `finished in ${elapsed.toFixed(1)}s`
            : label ?? (scriptedDone ? 'streaming live output' : 'reasoning in progress')}
        </span>
        {/* scanning progress bar while live; a solid settled bar once frozen */}
        <div className="relative h-2 w-28 overflow-hidden rounded-full border-[1.5px] border-[var(--line)] bg-[var(--paper)]">
          {frozen ? (
            <div className="absolute inset-0" style={{ backgroundColor: accent }} />
          ) : (
            <div
              className="absolute inset-y-0 w-1/2"
              style={{
                backgroundColor: accent,
                animation: reduce ? undefined : 'thinking-scan 1.8s linear infinite',
              }}
            />
          )}
        </div>
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
  level,
}: {
  text: string
  accent: string
  done?: boolean
  typing?: boolean
  /** Non-reasoning lines (e.g. a provider fallback notice) get a distinct
      color so "this provider hit its quota, trying the next one" reads as
      a status event, not as part of the model's own reasoning. */
  level?: 'info' | 'warn' | 'error' | 'success'
}) {
  const glyphColor =
    level === 'warn' ? 'var(--bloom-5)' : level === 'error' ? 'var(--red)' : accent
  const textColor =
    level === 'warn'
      ? 'text-[var(--bloom-5)]'
      : level === 'error'
      ? 'text-[var(--red)]'
      : 'text-[var(--ink)]'
  const glyph = level === 'warn' ? '⚠' : level === 'error' ? '✕' : done ? '✓' : '›'
  return (
    <div className="flex items-start gap-2">
      <span className="mt-px shrink-0 select-none" style={{ color: glyphColor }}>
        {glyph}
      </span>
      <span className={cn('min-w-0 flex-1 break-words', textColor)}>
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
