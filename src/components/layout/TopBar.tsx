'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { RotateCcw, Menu, Check, X, Loader2, Activity, Home, Bot, KeyRound, LogOut, History, User } from 'lucide-react'
import { STAGES } from '@/lib/types'
import { usePipelineStore } from '@/lib/store'
import { BLOOM_META } from '@/lib/bloom'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

interface TopBarProps {
  /** Mobile-only: opens the off-canvas sidebar Sheet. */
  onOpenMobileSidebar?: () => void
}

/**
 * Slim sticky top bar inside the console content area.
 * Shows the active stage label + agent, the Bloom-level pill, run status,
 * a "New run" reset button, a LIVE pill while a run is in flight, and
 * (right-most) site navigation + theme toggle + sign out — this is the
 * single top header for the console; it used to be duplicated by a
 * second custom <nav> rendered directly in app/page.tsx, which produced
 * two stacked sticky headers visually overlapping each other.
 */
export function TopBar({ onOpenMobileSidebar }: TopBarProps) {
  const router = useRouter()
  const activeStage = usePipelineStore((s) => s.activeStage)
  const bloomLevel = usePipelineStore((s) => s.bloomLevel)
  const running = usePipelineStore((s) => s.running)
  const completed = usePipelineStore((s) => s.completed)
  const failed = usePipelineStore((s) => s.failed)
  const resetRun = usePipelineStore((s) => s.resetRun)
  const runId = usePipelineStore((s) => s.runId)

  const active = STAGES.find((s) => s.id === activeStage) ?? STAGES[0]
  const hue = BLOOM_META[bloomLevel].hue

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-30 w-full flex h-14 shrink-0 items-center gap-3 border-b border-border/40 bg-background/80 backdrop-blur-md px-4 sm:px-6">
      {/* Mobile sidebar trigger */}
      {onOpenMobileSidebar && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onOpenMobileSidebar}
          className="-ml-1 size-8 lg:hidden"
          aria-label="Open pipeline navigation"
        >
          <Menu className="size-4" />
        </Button>
      )}

      {/* Active stage label + agent */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <motion.div
          key={active.id}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="flex min-w-0 items-baseline gap-2"
        >
          <h2 className="truncate text-[13px] font-semibold leading-none text-foreground sm:text-sm">
            {active.label}
          </h2>
          <span className="hidden truncate text-[11px] leading-none text-muted-foreground sm:inline">
            · {active.agent}
          </span>
        </motion.div>
      </div>

      {/* Right cluster */}
      <div className="flex shrink-0 items-center gap-2">
        {/* Bloom pill */}
        <span
          className="hidden items-center gap-1.5 border border-border/70 rounded-full px-2.5 py-0.5 text-[11px] font-bold sm:inline-flex"
          style={{ backgroundColor: `color-mix(in srgb, ${hue} 15%, transparent)`, borderColor: hue, color: 'var(--foreground)' }}
          title={`Bloom level: ${bloomLevel}`}
        >
          <span
            className="inline-block size-1.5 rounded-full border border-border"
            style={{ backgroundColor: 'var(--foreground)' }}
            aria-hidden
          />
          {bloomLevel}
        </span>

        {/* Run status badge */}
        <RunStatusBadge running={running} completed={completed} failed={failed} />

        {/* LIVE pill while running */}
        {running && (
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="inline-flex items-center gap-1 border border-border/70 bg-accent/15 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-foreground"
          >
            <span className="thinking-dot inline-block size-1.5 rounded-full bg-foreground" aria-hidden />
            Live
          </motion.span>
        )}

        {/* Command palette hint (desktop) */}
        <button
          type="button"
          onClick={() => {
            // dispatch a synthetic keydown so the global listener toggles it
            window.dispatchEvent(
              new KeyboardEvent('keydown', { key: 'k', metaKey: true })
            )
          }}
          className="hidden items-center gap-1.5 border border-border/70 rounded bg-muted/65 px-2 py-0.5 font-mono text-[10px] font-bold text-muted-foreground transition-all hover:bg-muted hover:text-foreground lg:flex"
          aria-label="Open command palette"
        >
          <span>⌘K</span>
        </button>

        {/* Run id (compact) */}
        {runId && (
          <span className="hidden font-mono text-[11px] text-muted-foreground/70 md:inline">
            {runId.slice(0, 8)}
          </span>
        )}

        {/* New run */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={resetRun}
              className="size-8 text-muted-foreground hover:text-foreground"
              aria-label="Start a new run"
              disabled={running}
            >
              <RotateCcw className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">New run</TooltipContent>
        </Tooltip>

        {/* Site navigation — divider then Home/Agents/API Keys/theme/sign out */}
        <span className="mx-0.5 hidden h-5 w-px bg-border md:inline-block" aria-hidden />

        <Button variant="ghost" size="sm" className="hidden h-8 gap-1.5 text-xs md:inline-flex" asChild>
          <Link href="/"><Home className="size-3" /><span className="hidden lg:inline">Home</span></Link>
        </Button>
        <Button variant="ghost" size="sm" className="hidden h-8 gap-1.5 text-xs md:inline-flex" asChild>
          <Link href="/app/agents"><Bot className="size-3" /><span className="hidden lg:inline">Agents</span></Link>
        </Button>
        <Button variant="ghost" size="sm" className="hidden h-8 gap-1.5 text-xs md:inline-flex" asChild>
          <Link href="/app/history"><History className="size-3" /><span className="hidden lg:inline">History</span></Link>
        </Button>
        <Button variant="ghost" size="sm" className="hidden h-8 gap-1.5 text-xs md:inline-flex" asChild>
          <Link href="/app/settings/api-keys"><KeyRound className="size-3" /><span className="hidden lg:inline">API Keys</span></Link>
        </Button>
        <Button variant="ghost" size="sm" className="hidden h-8 gap-1.5 text-xs md:inline-flex" asChild>
          <Link href="/app/settings/account"><User className="size-3" /><span className="hidden lg:inline">Profile</span></Link>
        </Button>
        <ThemeToggle />
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleLogout}>
          <LogOut className="size-3" /><span className="hidden lg:inline">Sign out</span>
        </Button>
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
        'inline-flex items-center gap-1 border rounded-full px-2.5 py-0.5 text-[11px] font-bold',
        cls,
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </span>
  )
}
