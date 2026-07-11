'use client'

import * as React from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Loader2, Check, X } from 'lucide-react'
import { STAGES, STAGE_ORDER } from '@/lib/types'
import type { StageId, StageStatus } from '@/lib/types'
import { usePipelineStore } from '@/lib/store'
import { BLOOM_META } from '@/lib/bloom'
import { cn } from '@/lib/utils'
import { SidebarStageItem } from './SidebarStageItem'
import { ShaderLogo } from '@/components/shader-icons'

const EXPANDED_WIDTH = 280
const COLLAPSED_WIDTH = 64

interface PipelineSidebarProps {
  collapsed: boolean
  /**
   * - `rail`   → desktop fixed left rail (animated width, hidden on `< lg`).
   * - `sheet`  → bare content rendered inside the mobile Sheet drawer.
   */
  variant?: 'rail' | 'sheet'
}

/**
 * Pipeline-driven sidebar. On `lg+` it renders as a fixed left rail whose
 * width animates between 280px (expanded) and 64px (collapsed). On `< lg`
 * the AppShell mounts a `variant="sheet"` instance inside a Sheet drawer.
 */
export function PipelineSidebar({ collapsed, variant = 'rail' }: PipelineSidebarProps) {
  if (variant === 'sheet') {
    return <SidebarContent collapsed={false} variant="sheet" />
  }
  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH }}
      transition={{ type: 'spring', stiffness: 320, damping: 36 }}
      aria-label="Pipeline navigation"
      className="glass-chrome relative z-20 hidden shrink-0 self-start border-r lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col"
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

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      {/* Header */}
      <header
        className={cn(
          'flex h-14 shrink-0 items-center border-b border-border/40',
          collapsed ? 'justify-center px-2' : 'justify-between px-4',
        )}
      >
        {collapsed ? (
          <Link href="/" className="flex items-center justify-center gap-0" title="DiagramMind">
            <ShaderLogo size={18} />
          </Link>
        ) : (
          <>
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <ShaderLogo size={16} />
              <span className="font-mono text-[13px] font-black uppercase tracking-tight text-foreground">
                DiagramMind
              </span>
            </Link>
            <span className="rounded-full border border-accent/40 bg-accent/15 px-1.5 py-px font-mono text-[10px] font-bold leading-none text-accent-foreground">
              v0.1
            </span>
          </>
        )}
      </header>

      {/* Nav */}
      <nav className="relative flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 scroll-slim">
        <ul className="relative flex flex-col gap-1">
          {STAGES.map((stage) => (
            <li key={stage.id}>
              <SidebarStageItem stage={stage} collapsed={collapsed} variant={variant} />
            </li>
          ))}
        </ul>

        {/* Collapse-to-rail hint during an active run */}
        <AnimatePresence>
          {running && !collapsed && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="hw-panel mt-3 flex items-center gap-2 rounded-xl px-2.5 py-1.5"
              style={{ background: 'var(--accent-muted)' }}
            >
              <Loader2 className="size-3 animate-spin" style={{ color: 'var(--accent)' }} />
              <span className="text-[11px] font-medium leading-tight" style={{ color: 'var(--text-primary)' }}>
                Pipeline running — collapse the rail to focus.
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Run block */}
      {!collapsed && <RunBlock />}

      {/* Footer: collapse toggle (rail variant only) */}
      {variant === 'rail' && (
        <div
          className={cn(
            'flex h-12 shrink-0 items-center border-t border-border/40',
            collapsed ? 'justify-center px-2' : 'justify-end px-3',
          )}
        >
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            {collapsed ? (
              <ChevronRight className="size-4" />
            ) : (
              <>
                <span>Collapse</span>
                <ChevronLeft className="size-4" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
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

  const hue = BLOOM_META[bloomLevel].hue

  // Surface whichever stage most recently reported a provider — prefer the
  // active stage, but fall back to the last stage that has one (e.g. the
  // run just completed and activeStage moved to 'results', which has none).
  const activeProviderInfo =
    stages[activeStage]?.provider != null
      ? stages[activeStage]
      : [...STAGE_ORDER]
          .reverse()
          .map((id) => stages[id])
          .find((s) => s?.provider)

  let statusLabel = 'No run yet'
  let statusIcon: React.ReactNode = null
  if (running) {
    statusLabel = 'Running'
    statusIcon = <Loader2 className="size-3 animate-spin text-foreground" />
  } else if (failed) {
    statusLabel = 'Failed'
    statusIcon = <X className="size-3 text-destructive" />
  } else if (completed) {
    statusLabel = 'Completed'
    statusIcon = <Check className="size-3 text-foreground" />
  }

  return (
    <div className="hw-panel mx-2 mb-2 shrink-0 rounded-xl p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Run
        </span>
        {statusIcon && (
          <span className="flex items-center gap-1 text-[11px] font-bold text-foreground">
            {statusIcon}
            <span>{statusLabel}</span>
          </span>
        )}
      </div>

      {/* Active AI provider */}
      {activeProviderInfo?.provider && (
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/15 px-2 py-1">
          <span
            className={cn(
              'inline-flex h-2 w-2 shrink-0 rounded-full bg-accent-foreground/80',
              running && 'animate-pulse'
            )}
            aria-hidden
          />
          <span className="min-w-0 flex-1 truncate font-mono text-[10.5px] font-bold text-accent-foreground">
            {activeProviderInfo.provider}
            {activeProviderInfo.model && (
              <span className="opacity-70"> · {activeProviderInfo.model}</span>
            )}
          </span>
        </div>
      )}

      {/* Bloom pill */}
      <div className="mb-2 flex items-center gap-2">
        <span
          className="inline-flex h-2.5 w-2.5 shrink-0 border"
          style={{ backgroundColor: hue, borderColor: hue }}
          aria-hidden
        />
        <span
          className="rounded-full border px-2.5 py-0.5 text-[11px] font-bold text-foreground"
          style={{ backgroundColor: `color-mix(in srgb, ${hue} 15%, transparent)`, borderColor: hue }}
        >
          {bloomLevel}
        </span>
      </div>

      {/* Run id */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] text-muted-foreground">
          {runId ? truncateRunId(runId) : '—'}
        </span>
        {runId && (
          <span className="font-mono text-[10px] text-muted-foreground/60">
            {bloomLevel.slice(0, 3).toUpperCase()}
          </span>
        )}
      </div>

      {failed && errorMessage && (
        <p
          className="mt-2 line-clamp-2 text-[11px] leading-snug text-red-300/80"
          title={errorMessage}
        >
          {errorMessage}
        </p>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */

function computeProgress(
  stages: Record<StageId, { status: StageStatus }>,
  running: boolean,
): number {
  if (STAGES.length === 0) return 0
  let lastIndex = -1
  for (let i = 0; i < STAGE_ORDER.length; i++) {
    const s = stages[STAGE_ORDER[i]]
    if (!s) continue
    if (s.status === 'done' || s.status === 'flagged' || (running && s.status === 'running')) {
      lastIndex = i
    }
  }
  if (lastIndex < 0) return 0
  return (lastIndex + 1) / STAGE_ORDER.length
}

function truncateRunId(id: string): string {
  if (id.length <= 12) return id
  return `${id.slice(0, 6)}…${id.slice(-4)}`
}
