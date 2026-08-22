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
 * THE GROUP CHAT
 * --------------
 * The feed was already a thread in behaviour — agents speak in turn,
 * nothing is torn down, it grows downward — but it did not LOOK like one.
 * Five identical full-width panels stacked vertically read as a report
 * with five sections, not as five participants talking, and a reader had
 * to check the header of each panel to work out who was speaking.
 *
 * So it is drawn as a group chat now, and the chat conventions are doing
 * real work rather than being decoration:
 *
 *   · a persistent avatar gutter — the agent's colour and initial sit in
 *     the margin, so who is speaking is legible in peripheral vision
 *     without reading a word;
 *   · bubbles with a tail pointing back at their speaker, capped short
 *     of full width so the thread has a ragged edge like a real
 *     conversation instead of a column of blocks;
 *   · alternating sides — the first agent's bubble pops in from the
 *     left, the next from the right, and so on down the thread. Five
 *     identical panels stacked in a single left-hand column still read
 *     as one long report even with avatars and tails added; a thread
 *     that visibly zig-zags reads as five distinct participants taking
 *     turns, the way a real two-party chat does;
 *   · consecutive turns by the same agent group under one avatar;
 *   · a day-divider style rule between agents, carrying the handoff
 *     ("Vision → Generator"), because in this thread the handoff IS the
 *     information — it is the pipeline advancing a stage;
 *   · the live agent shows a typing indicator; finished ones settle to a
 *     quiet, read-only bubble with a timestamp.
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
import { STAGES, type StageId } from '@/lib/types'
import { cn } from '@/lib/utils'
import { AgentThinkingConsole } from './AgentThinkingConsole'

const FEED_ORDER: StageId[] = ['extraction', 'generation', 'answering', 'verification', 'results']

const STAGE_LABEL: Partial<Record<StageId, string>> = {
  extraction: 'Vision agent parsing the diagram…',
  generation: 'Generator agent drafting questions…',
  answering: 'Solver agent answering blind…',
  verification: 'Critic agent cross-checking Q&A pairs…',
  results: 'Curator agent assembling the verified set…',
}

/** Each speaker gets one hue off the Bloom spectrum and keeps it. */
const AGENT_HUE: Record<string, string> = {
  extraction: 'var(--bloom-1)',
  generation: 'var(--bloom-3)',
  answering: 'var(--bloom-2)',
  verification: 'var(--bloom-5)',
  results: 'var(--bloom-6)',
}

/** Readable ink on each of those hues. */
const AGENT_FG: Record<string, string> = {
  extraction: '#ffffff',
  generation: '#0a0a0a',
  answering: '#ffffff',
  verification: '#0a0a0a',
  results: '#ffffff',
}

function agentName(id: StageId): string {
  return STAGES.find((s) => s.id === id)?.agent ?? id
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
      <div className="shrink-0 border-b-2 border-[var(--line)] bg-[var(--card)] px-5 py-3 md:px-8">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="font-[family-name:var(--font-archivo)] text-xl font-black uppercase leading-none tracking-[-0.03em] md:text-[24px]">
            Agents at work
          </h1>
          <span className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-[var(--line)] bg-[var(--yellow)] px-2 py-[3px] font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[#0a0a0a]">
            <span className="thinking-dot size-1.5 rounded-full bg-[#0a0a0a]" aria-hidden />
            live
          </span>
          <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-2)]">
            {visible.length} of {FEED_ORDER.length} agents
          </span>
        </div>
        <p className="mt-1 max-w-3xl text-[11.5px] leading-snug text-[var(--ink-2)]">
          One thread, five speakers. Nothing is torn down between them, so you can
          scroll back and read what any agent actually said.
        </p>
      </div>

      {/* ---- the thread ---- */}
      <div
        ref={bodyRef}
        className="scroll-slim min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-8"
      >
        <div className="mx-auto flex w-full max-w-[940px] flex-col pb-8">
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

          {visible.map((id, i) => {
            const status = stages[id]?.status ?? 'idle'
            const live = status === 'running'
            const hue = AGENT_HUE[id] ?? 'var(--line)'
            const fg = AGENT_FG[id] ?? '#0a0a0a'
            const name = agentName(id)
            const prev = i > 0 ? visible[i - 1] : null

            return (
              <React.Fragment key={id}>
                {/* ---- handoff divider ----
                    The moment one agent passes to the next is the single
                    most informative event in the run, so it gets the
                    thread's day-divider slot rather than being implied by
                    a gap. */}
                {prev && (
                  <div className="my-4 flex items-center gap-3" aria-hidden>
                    <span className="h-[1.5px] flex-1 rounded-none bg-[var(--line)]/15" />
                    <span className="shrink-0 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--ink-2)]">
                      {agentName(prev)} → {name}
                    </span>
                    <span className="h-[1.5px] flex-1 rounded-none bg-[var(--line)]/15" />
                  </div>
                )}

                {/* ---- side alternation ----
                    Agent 1 (even index) speaks from the left, agent 2
                    (odd index) from the right, and so on — the whole
                    row flips with `flex-row-reverse`, which for free
                    also flips the tail, the header alignment and the
                    slide-in direction, so a right-side bubble genuinely
                    pops in from the right rather than just being a
                    mirrored copy sitting in the same spot. */}
                {(() => {
                  const rightSide = i % 2 === 1
                  return (
                    <motion.div
                      initial={reduce ? false : { opacity: 0, y: 14, x: rightSide ? 18 : -18 }}
                      animate={{ opacity: 1, y: 0, x: 0 }}
                      transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                      className={cn('flex items-start gap-3', rightSide && 'flex-row-reverse')}
                    >
                      {/* ---- avatar gutter ---- */}
                      <div className="flex w-9 shrink-0 flex-col items-center gap-1.5 pt-1">
                        <span
                          className={cn(
                            'flex size-9 items-center justify-center rounded-full border-2 border-[var(--line)]',
                            'font-[family-name:var(--font-archivo)] text-[13px] font-black leading-none',
                            live && 'animate-pulse',
                          )}
                          style={{ background: hue, color: fg }}
                          title={name}
                          aria-hidden
                        >
                          {name.charAt(0).toUpperCase()}
                        </span>
                        {/* the thread line, joining this speaker to the next */}
                        {i < visible.length - 1 && (
                          <span
                            className="w-[2px] flex-1 rounded-none bg-[var(--line)]/15"
                            aria-hidden
                          />
                        )}
                      </div>

                      {/* ---- the bubble ---- */}
                      <div className="relative min-w-0 flex-1">
                        {/* the tail, pointing back at the avatar on
                            whichever side this bubble sits */}
                        <span
                          aria-hidden
                          className={cn(
                            'absolute top-[15px] size-3 rotate-45 rounded-[2px] bg-[var(--card)]',
                            rightSide
                              ? 'right-[-7px] border-r-2 border-t-2 border-[var(--line)]'
                              : 'left-[-7px] border-b-2 border-l-2 border-[var(--line)]',
                          )}
                        />
                        <div
                          className={cn(
                            'mb-1.5 flex items-baseline gap-2',
                            rightSide && 'flex-row-reverse',
                          )}
                        >
                          <span className="font-[family-name:var(--font-archivo)] text-[12px] font-black uppercase tracking-[0.02em]">
                            {name}
                          </span>
                          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--ink-2)]">
                            {live ? 'typing…' : status === 'error' ? 'failed' : 'sent'}
                          </span>
                        </div>
                        <AgentThinkingConsole
                          stageId={id}
                          label={STAGE_LABEL[id]}
                          className="!max-w-[min(100%,760px)]"
                        />
                      </div>
                    </motion.div>
                  )
                })()}
              </React.Fragment>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default PipelineThinkingFeed
