'use client'

/**
 * PipelineThinkingFeed — one page, one conversation.
 *
 * Previously, each of the five working agents (Vision, Generator, Solver,
 * Critic, Curator) got its own full-page "thinking" screen via the normal
 * per-stage router in app/page.tsx. The moment one agent finished, the
 * whole page was torn down and replaced by the next agent's screen from
 * scratch — so watching a run meant the app visibly jumping to a new page
 * every ~10 seconds, and there was no way to scroll back and re-read what
 * an earlier agent had actually said.
 *
 * This component replaces that sequence, for the whole time the pipeline
 * is actively running. Every agent's console lives in one scrolling feed,
 * stacked top to bottom in run order, like a chat thread: an agent that
 * has finished settles into a read-only, "done" bubble and stays put —
 * it is never unmounted — while only the newest agent is actively
 * "typing". The page itself never changes; it just grows downward, and
 * auto-scrolls to keep the live agent in view.
 *
 * Wired in from app/app/page.tsx: shown instead of the normal per-stage
 * switch whenever `running` is true and the active stage is one of the
 * five working agents. Once the run truly finishes (`running` flips back
 * to false), normal routing takes back over and lands on the full
 * Results payoff page.
 */

import * as React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { usePipelineStore } from '@/lib/store'
import type { StageId } from '@/lib/types'
import { AgentThinkingConsole } from './AgentThinkingConsole'

const FEED_ORDER: StageId[] = ['extraction', 'generation', 'answering', 'verification', 'results']

const STAGE_LABEL: Partial<Record<StageId, string>> = {
  extraction: 'Vision agent parsing the diagram…',
  generation: 'Generator agent drafting questions…',
  answering: 'Solver agent answering blind…',
  verification: 'Critic agent cross-checking Q&A pairs…',
  results: 'Curator agent assembling the verified set…',
}

export function PipelineThinkingFeed() {
  const reduce = useReducedMotion()
  const stages = usePipelineStore((s) => s.stages)

  // Only agents that have actually started (or finished) get a bubble.
  // A stage still sitting at 'idle' hasn't been reached yet, so it isn't
  // shown — the feed reveals itself one agent at a time, in order.
  const visible = FEED_ORDER.filter((id) => (stages[id]?.status ?? 'idle') !== 'idle')

  const bodyRef = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: reduce ? 'auto' : 'smooth' })
  }, [visible.length, reduce])

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* ---- masthead ---- */}
      <div className="shrink-0 border-b-2 border-[var(--line)] bg-[var(--card)] px-5 py-3.5 md:px-8">
        <div className="lbl text-[var(--ink-2)]">Pipeline · live</div>
        <h1 className="font-[family-name:var(--font-archivo)] text-xl font-black uppercase leading-none tracking-[-0.03em] md:text-2xl">
          Agents at work
        </h1>
        <p className="mt-1.5 max-w-3xl text-[12px] leading-snug text-[var(--ink-2)]">
          Each agent reasons in turn on this one page — nothing is torn down between
          them, so you can scroll back and read what any of them actually said.
        </p>
      </div>

      {/* ---- the feed ---- */}
      <div
        ref={bodyRef}
        className="scroll-slim min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-8"
      >
        <div className="mx-auto flex w-full max-w-[880px] flex-col gap-4 pb-6">
          {visible.length === 0 && (
            <div className="ticket mx-auto flex max-w-[420px] flex-col items-center gap-2 px-8 py-7 text-center">
              <p className="font-[family-name:var(--font-archivo)] text-[14px] font-black uppercase tracking-[-0.01em]">
                Starting the run…
              </p>
              <p className="text-[11.5px] leading-relaxed text-[var(--ink-2)]">
                The first agent will appear here the moment it starts reading the
                diagram.
              </p>
            </div>
          )}
          {visible.map((id) => (
            <motion.div
              key={id}
              initial={reduce ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              <AgentThinkingConsole stageId={id} label={STAGE_LABEL[id]} />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default PipelineThinkingFeed
