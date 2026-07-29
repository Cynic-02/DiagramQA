'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { RotateCcw, Menu, Check, X, Loader2, Activity } from 'lucide-react'
import { STAGES } from '@/lib/types'
import { usePipelineStore } from '@/lib/store'
import { BLOOM_META } from '@/lib/bloom'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { MainNav } from './MainNav'
import { AppearanceMenu } from './AppearanceMenu'
import { UserMenu } from './UserMenu'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

interface TopBarProps {
  /** Mobile-only: opens the off-canvas sidebar Sheet. */
  onOpenMobileSidebar?: () => void
  /** Signed-in user's email, shown in the account menu. */
  email?: string | null
}

/**
 * Sticky console header, organised into three zones.
 *
 * It previously ran fifteen controls in a single right-hand cluster —
 * stage state, run telemetry, five nav links, a theme toggle, six
 * palette dots and sign out — with no grouping, so everything competed
 * equally for attention and nothing was findable.
 *
 * Now:
 *   left    context   — stage title and agent
 *   middle  telemetry — Bloom level, run status, run id, reset
 *   right   navigation— primary nav, appearance, account
 *
 * Telemetry describes the current run, so it belongs beside the stage
 * it refers to, not beside Sign out. That split alone takes the right
 * cluster from fifteen items to three.
 */
export function TopBar({ onOpenMobileSidebar, email }: TopBarProps) {
  const activeStage = usePipelineStore((s) => s.activeStage)
  const bloomLevel = usePipelineStore((s) => s.bloomLevel)
  const running = usePipelineStore((s) => s.running)
  const completed = usePipelineStore((s) => s.completed)
  const failed = usePipelineStore((s) => s.failed)
  const resetRun = usePipelineStore((s) => s.resetRun)
  const runId = usePipelineStore((s) => s.runId)

  const active = STAGES.find((s) => s.id === activeStage) ?? STAGES[0]
  const hue = BLOOM_META[bloomLevel].hue

  return (
    <header className="glass-chrome sticky top-0 z-30 flex h-14 w-full shrink-0 items-center gap-3 border-b px-4 sm:px-6">
      {/* Mobile sidebar trigger */}
      {onOpenMobileSidebar && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onOpenMobileSidebar}
          className="-ml-1 size-8 shrink-0 lg:hidden"
          aria-label="Open pipeline navigation"
        >
          <Menu className="size-4" />
        </Button>
      )}

      {/* ---- Zone 1: stage context ---- */}
      <motion.div
        key={active.id}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="flex min-w-0 shrink items-baseline gap-2"
      >
        <h2 className="truncate text-[13px] font-semibold leading-none text-foreground sm:text-sm">
          {active.label}
        </h2>
        <span className="hidden truncate text-[11px] leading-none text-muted-foreground lg:inline">
          · {active.agent}
        </span>
      </motion.div>

      {/* ---- Zone 2: run telemetry ---- */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span
          className="hidden shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold md:inline-flex"
          style={{
            backgroundColor: `color-mix(in srgb, ${hue} 15%, transparent)`,
            borderColor: hue,
            color: 'var(--foreground)',
          }}
          title={`Bloom level: ${bloomLevel}`}
        >
          <span
            className="inline-block size-1.5 rounded-full border border-border"
            style={{ backgroundColor: 'var(--foreground)' }}
            aria-hidden
          />
          {bloomLevel}
        </span>

        <RunStatusBadge running={running} completed={completed} failed={failed} />

        {running && (
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border/70 bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-foreground"
          >
            <span
              className="thinking-dot inline-block size-1.5 rounded-full bg-foreground"
              aria-hidden
            />
            Live
          </motion.span>
        )}

        {runId && (
          <span className="hidden shrink-0 font-mono text-[11px] text-muted-foreground/70 xl:inline">
            {runId.slice(0, 8)}
          </span>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={resetRun}
              className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
              aria-label="Start a new run"
              disabled={running}
            >
              <RotateCcw className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">New run</TooltipContent>
        </Tooltip>
      </div>

      {/* ---- Zone 3: navigation ---- */}
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() =>
            window.dispatchEvent(
              new KeyboardEvent('keydown', { key: 'k', metaKey: true }),
            )
          }
          className="hidden items-center rounded border border-border/70 bg-muted/65 px-2 py-1 font-mono text-[10px] font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground xl:flex"
          aria-label="Open command palette"
        >
          ⌘K
        </button>

        <MainNav className="hidden sm:flex" />

        <span className="mx-0.5 hidden h-5 w-px bg-border sm:inline-block" aria-hidden />

        <AppearanceMenu />
        <UserMenu email={email} />
      </div>
    </header>
  )
}

/* ------------------------------------------------------------------ */

function RunStatusBadge({
  running,
  completed,
  failed,
}: {
  running: boolean
  completed: boolean
  failed: boolean
}) {
  let label = 'Idle'
  let icon: React.ReactNode = <Activity className="size-3" />
  let cls = 'border-border bg-muted text-muted-foreground'

  if (running) {
    label = 'Running'
    icon = <Loader2 className="size-3 animate-spin" />
    cls = 'border-accent/40 bg-accent/15 text-accent-foreground'
  } else if (failed) {
    label = 'Failed'
    icon = <X className="size-3 text-destructive" />
    cls = 'border-destructive/40 bg-destructive/15 text-destructive'
  } else if (completed) {
    label = 'Done'
    icon = <Check className="size-3 text-primary" />
    cls = 'border-primary/40 bg-primary/10 text-primary-foreground dark:text-foreground'
  }

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold',
        cls,
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </span>
  )
}
