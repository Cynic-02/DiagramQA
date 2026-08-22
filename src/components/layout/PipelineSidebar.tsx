'use client'

/**
 * PipelineSidebar — the run rail.
 *
 * Rebuilt under RUBRIC. The old rail was a soft, rounded, glassy list
 * with a pill-covered "Run" card at the bottom; it read as decoration
 * rather than as instrumentation, and nothing about it told you how far
 * through a run you were.
 *
 * Now it is a ruled ledger:
 *
 *   MARK      wordmark + version, on an ink rule
 *   PROGRESS  a stepped six-segment bar — the run's actual position
 *   STAGES    numbered 01…06, each a shared-border row with a status mark
 *   RUN       a labelled key/value block: status, host, level, id
 *   FOOT      the collapse toggle
 *
 * Collapsed it drops to 68px: number, status mark and the progress bar,
 * which is everything you need to keep tracking a run while you work.
 */

import * as React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { PanelLeftClose, PanelLeftOpen, Loader2, Check, X, Lock } from 'lucide-react'
import { STAGES, STAGE_ORDER } from '@/lib/types'
import type { StageId, StageMeta, StageStatus } from '@/lib/types'
import { usePipelineStore } from '@/lib/store'
import { BLOOM_META } from '@/lib/bloom'
import { cn } from '@/lib/utils'
import { ShaderLogo } from '@/components/shader-icons'

/* The rail is a table of contents, not a panel. At 264px it was taking
   a seventh of a 1920 screen to show six short labels and a progress
   bar, and every stage below it lost that width for its actual work.
   208 still fits "Question Generation" on one line at its type size. */
const EXPANDED_WIDTH = 208
const COLLAPSED_WIDTH = 60

interface PipelineSidebarProps {
  collapsed: boolean
  variant?: 'rail' | 'sheet'
}

export function PipelineSidebar({ collapsed, variant = 'rail' }: PipelineSidebarProps) {
  if (variant === 'sheet') return <SidebarContent collapsed={false} variant="sheet" />
  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH }}
      transition={{ type: 'spring', stiffness: 340, damping: 38 }}
      aria-label="Pipeline navigation"
      className="relative z-20 hidden min-h-0 shrink-0 border-r-2 border-[var(--line)] bg-[var(--card)] lg:flex lg:flex-col"
    >
      <SidebarContent collapsed={collapsed} variant="rail" />
    </motion.aside>
  )
}

/* ------------------------------------------------------------------ */

function SidebarContent({
  collapsed,
  variant,
}: {
  collapsed: boolean
  variant: 'rail' | 'sheet'
}) {
  const setSidebarCollapsed = usePipelineStore((s) => s.setSidebarCollapsed)
  const running = usePipelineStore((s) => s.running)
  const stages = usePipelineStore((s) => s.stages)
  const activeStage = usePipelineStore((s) => s.activeStage)
  const setActiveStage = usePipelineStore((s) => s.setActiveStage)

  const reachedIndex = lastReachedIndex(stages, running)

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      {/* ---------- mark ---------- */}
      <header
        className={cn(
          'flex h-12 shrink-0 items-center border-b-2 border-[var(--line)]',
          collapsed ? 'justify-center px-1' : 'justify-between px-2.5',
        )}
      >
        <Link
          href="/"
          title="DiagramMind"
          className="flex items-center gap-2 transition-opacity hover:opacity-70"
        >
          <ShaderLogo size={collapsed ? 20 : 16} />
          {!collapsed && (
            /* The wordmark is DiagramMind, not DIAGRAMMIND. Two capitals
               inside one word are the whole shape of the name — flatten
               them with `uppercase` and it reads as one long unbroken run
               of letters. Everything else in this rail stays uppercased;
               the name is the exception. */
            <span className="font-[family-name:var(--font-archivo)] text-[13px] font-black tracking-[-0.02em] text-[var(--ink)]">
              DiagramMind
            </span>
          )}
        </Link>
        {!collapsed && (
          <span className="border-2 border-[var(--line)] bg-[var(--yellow)] px-1.5 py-px font-mono text-[9px] font-bold leading-none text-[#0a0a0a]">
            v0.1
          </span>
        )}
      </header>

      {/* ---------- progress ---------- */}
      <div
        className={cn(
          'shrink-0 border-b-2 border-[var(--line)]',
          collapsed ? 'px-2 py-2' : 'px-2.5 py-2',
        )}
      >
        {!collapsed && (
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--ink-2)]">
              Progress
            </span>
            <span className="dat text-[10px] font-bold text-[var(--ink)]">
              {Math.max(0, reachedIndex + 1)} / {STAGE_ORDER.length}
            </span>
          </div>
        )}
        <div className="flex h-2 overflow-hidden rounded-[var(--r-xs)] border-[1.5px] border-[var(--line)]">
          {STAGE_ORDER.map((id, i) => (
            <span
              key={id}
              className={cn(
                'flex-1 rounded-none transition-colors duration-200',
                i > 0 && 'border-l-[1.5px] border-[var(--line)]',
                i <= reachedIndex
                  ? stages[id]?.status === 'error'
                    ? 'bg-[var(--red)]'
                    : stages[id]?.status === 'running'
                    ? 'bg-[var(--yellow)]'
                    : 'bg-[var(--ink)]'
                  : 'bg-transparent',
              )}
            />
          ))}
        </div>
      </div>

      {/* ---------- stages ---------- */}
      <nav className="scroll-slim min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <ul>
          {STAGES.map((stage, i) => (
            <li key={stage.id}>
              <StageRow
                index={i}
                stage={stage}
                status={stages[stage.id]?.status ?? 'idle'}
                active={activeStage === stage.id}
                locked={i > reachedIndex + 1}
                collapsed={collapsed}
                onSelect={() => setActiveStage(stage.id)}
              />
            </li>
          ))}
        </ul>
      </nav>

      {/* ---------- run block ---------- */}
      {!collapsed && <RunBlock />}

      {/* ---------- foot ---------- */}
      {variant === 'rail' && (
        <div
          className={cn(
            'flex h-9 shrink-0 items-center border-t-2 border-[var(--line)]',
            collapsed ? 'justify-center px-1' : 'justify-end px-2',
          )}
        >
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand rail' : 'Collapse rail'}
            className="inline-flex h-7 items-center gap-1.5 border-2 border-transparent px-2 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--ink-2)] transition-colors hover:border-[var(--line)] hover:bg-[var(--yellow)] hover:text-[#0a0a0a]"
          >
            {collapsed ? (
              <PanelLeftOpen className="size-3.5" />
            ) : (
              <>
                Collapse
                <PanelLeftClose className="size-3.5" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */

function StageRow({
  index,
  stage,
  status,
  active,
  locked,
  collapsed,
  onSelect,
}: {
  index: number
  stage: StageMeta
  status: StageStatus
  active: boolean
  locked: boolean
  collapsed: boolean
  onSelect: () => void
}) {
  const num = String(index + 1).padStart(2, '0')

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={locked}
      aria-current={active ? 'step' : undefined}
      title={collapsed ? `${stage.label} — ${stage.agent}` : undefined}
      className={cn(
        'group relative flex w-full items-center border-b-2 border-[var(--line)]/30 text-left',
        'transition-[background-color] duration-[90ms] ease-[cubic-bezier(.2,0,0,1)]',
        collapsed ? 'justify-center px-1 py-2' : 'gap-2 px-2.5 py-2',
        locked && 'opacity-40',
        active ? 'bg-[var(--yellow)]' : 'hover:bg-[var(--muted)]',
      )}
    >
      {/* active edge marker — a 4px red rule, not a rounded pill */}
      {active && (
        <span aria-hidden className="absolute inset-y-0 left-0 w-[4px] bg-[var(--red)]" />
      )}

      <span
        className={cn(
          'dat shrink-0 text-[10px] font-bold leading-none',
          active ? 'text-[#0a0a0a]' : 'text-[var(--ink-2)]',
        )}
      >
        {num}
      </span>

      {!collapsed && (
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              'block truncate text-[12px] font-bold leading-tight',
              active ? 'text-[#0a0a0a]' : 'text-[var(--ink)]',
            )}
          >
            {stage.label}
          </span>
          <span
            className={cn(
              'block truncate font-mono text-[9px] uppercase tracking-[0.12em]',
              active ? 'text-[#0a0a0a]/65' : 'text-[var(--ink-2)]',
            )}
          >
            {stage.agent}
          </span>
        </span>
      )}

      <StatusMark status={status} locked={locked} />
    </button>
  )
}

function StatusMark({ status, locked }: { status: StageStatus; locked: boolean }) {
  const base = 'flex size-[18px] shrink-0 items-center justify-center border-2 border-[var(--line)]'
  if (locked) {
    return (
      <span className={cn(base, 'border-dashed')} aria-label="locked">
        <Lock className="size-2.5 text-[var(--ink-2)]" />
      </span>
    )
  }
  switch (status) {
    case 'running':
      return (
        <span className={cn(base, 'bg-[var(--yellow)]')} aria-label="running">
          <Loader2 className="size-2.5 animate-spin text-[#0a0a0a]" strokeWidth={3} />
        </span>
      )
    case 'done':
      return (
        <span className={cn(base, 'bg-[var(--ink)]')} aria-label="done">
          <Check className="size-2.5 text-[var(--paper)]" strokeWidth={4} />
        </span>
      )
    case 'flagged':
      return (
        <span className={cn(base, 'bg-[var(--bloom-5)]')} aria-label="flagged">
          <span className="dat text-[9px] font-black leading-none text-[#0a0a0a]">!</span>
        </span>
      )
    case 'error':
      return (
        <span className={cn(base, 'bg-[var(--red)]')} aria-label="error">
          <X className="size-2.5 text-white" strokeWidth={4} />
        </span>
      )
    default:
      return <span className={base} aria-label="idle" />
  }
}

/* ------------------------------------------------------------------ */

function RunBlock() {
  const bloomLevel = usePipelineStore((s) => s.bloomLevel)
  const runId = usePipelineStore((s) => s.runId)
  const running = usePipelineStore((s) => s.running)
  const completed = usePipelineStore((s) => s.completed)
  const failed = usePipelineStore((s) => s.failed)
  const errorMessage = usePipelineStore((s) => s.errorMessage)
  const activeStage = usePipelineStore((s) => s.activeStage)
  const stages = usePipelineStore((s) => s.stages)

  const meta = BLOOM_META[bloomLevel]

  // Surface whichever stage most recently reported a provider — prefer the
  // active stage, but fall back to the last stage that has one.
  const providerInfo =
    stages[activeStage]?.provider != null
      ? stages[activeStage]
      : [...STAGE_ORDER]
          .reverse()
          .map((id) => stages[id])
          .find((s) => s?.provider)

  const status = running
    ? { label: 'Running', bg: 'bg-[var(--yellow)]', fg: 'text-[#0a0a0a]' }
    : failed
    ? { label: 'Failed', bg: 'bg-[var(--red)]', fg: 'text-white' }
    : completed
    ? { label: 'Complete', bg: 'bg-[var(--ink)]', fg: 'text-[var(--paper)]' }
    : { label: 'Idle', bg: 'bg-transparent', fg: 'text-[var(--ink-2)]' }

  return (
    <div className="shrink-0 border-t-[3px] border-[var(--line)]">
      <div className="flex items-center justify-between px-3 py-1.5">
        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--ink-2)]">
          Run
        </span>
        <span
          className={cn(
            'border-2 border-[var(--line)] px-1.5 py-px font-mono text-[9px] font-bold uppercase leading-none tracking-[0.12em]',
            status.bg,
            status.fg,
          )}
        >
          {status.label}
        </span>
      </div>

      <dl className="border-t-2 border-[var(--line)]/30">
        <Row k="Host">
          {providerInfo?.provider ? (
            <span className="truncate" title={`${providerInfo.provider} ${providerInfo.model ?? ''}`}>
              {providerInfo.provider}
              {providerInfo.model && (
                <span className="text-[var(--ink-2)]"> · {providerInfo.model}</span>
              )}
            </span>
          ) : (
            <span className="text-[var(--ink-2)]">—</span>
          )}
        </Row>
        <Row k="Level">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="size-2 shrink-0 border border-[var(--line)]"
              style={{ backgroundColor: meta.hue }}
              aria-hidden
            />
            {bloomLevel}
          </span>
        </Row>
        <Row k="Id">
          <span className="truncate text-[var(--ink-2)]" title={runId ?? undefined}>
            {runId ? truncateRunId(runId) : '—'}
          </span>
        </Row>
      </dl>

      {failed && errorMessage && (
        <p
          className="line-clamp-2 border-t-2 border-[var(--line)] bg-[var(--red)]/12 px-3 py-1.5 text-[10px] leading-snug text-[var(--ink)]"
          title={errorMessage}
        >
          {errorMessage}
        </p>
      )}
    </div>
  )
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2 border-b-2 border-[var(--line)]/20 px-3 py-1">
      <dt className="shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--ink-2)]">
        {k}
      </dt>
      <dd className="dat min-w-0 truncate text-right text-[10px] font-bold text-[var(--ink)]">
        {children}
      </dd>
    </div>
  )
}

/* ------------------------------------------------------------------ */

/** Index of the furthest stage the run has actually reached. */
function lastReachedIndex(
  stages: Record<StageId, { status: StageStatus }>,
  running: boolean,
): number {
  let last = -1
  for (let i = 0; i < STAGE_ORDER.length; i++) {
    const s = stages[STAGE_ORDER[i]]
    if (!s) continue
    if (
      s.status === 'done' ||
      s.status === 'flagged' ||
      s.status === 'error' ||
      (running && s.status === 'running')
    ) {
      last = i
    }
  }
  return last
}

function truncateRunId(id: string): string {
  if (id.length <= 14) return id
  return `${id.slice(0, 7)}…${id.slice(-4)}`
}
