'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Menu, Check, X, Loader2, Activity } from 'lucide-react'
import { STAGES } from '@/lib/types'
import { usePipelineStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { MainNav } from './MainNav'
import { AppearanceMenu } from './AppearanceMenu'
import { UserMenu } from './UserMenu'

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
 *   middle  telemetry — one badge, and only while it has news
 *   right   navigation— primary nav, appearance, account
 *
 * Telemetry describes the current run, so it belongs beside the stage
 * it refers to, not beside Sign out. That split alone takes the right
 * cluster from fifteen items to three; the middle zone then went from
 * five permanent controls to one conditional badge, because everything
 * else it held was already legible somewhere closer to where it
 * mattered.
 */
export function TopBar({ onOpenMobileSidebar, email }: TopBarProps) {
  const activeStage = usePipelineStore((s) => s.activeStage)
  const running = usePipelineStore((s) => s.running)
  const completed = usePipelineStore((s) => s.completed)
  const failed = usePipelineStore((s) => s.failed)

  const active = STAGES.find((s) => s.id === activeStage) ?? STAGES[0]

  return (
    <header className="z-30 flex h-12 w-full shrink-0 items-center gap-3 border-b-2 border-[var(--line)] bg-[var(--card)] px-4 sm:px-6">
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
        <h2 className="truncate font-[family-name:var(--font-archivo)] text-[13px] font-black uppercase leading-none tracking-[-0.01em] text-[var(--ink)]">
          {active.label}
        </h2>
        <span className="hidden truncate font-mono text-[10px] uppercase leading-none tracking-[0.12em] text-[var(--ink-2)] lg:inline">
          · {active.agent}
        </span>
      </motion.div>

      {/* ---- Zone 2: run telemetry ----
          Reduced to one badge, and only when that badge has something
          to say.

          It used to carry five things at once: the Bloom level, a
          status pill, a separate LIVE pill, a truncated run id and a
          reset button. Every one of them is already on screen
          somewhere better — the level and the score summary are in the
          stage masthead directly underneath, the run id is in the
          sidebar footer, and "new run" belongs with the other run
          actions rather than orbiting on its own. A status of DONE is
          the loudest kind of redundancy: the page below it already
          says "4 VERIFIED QUESTIONS", which is what done looks like.

          So the badge appears while a run is live or has failed — the
          two states you cannot read off the page itself — and the row
          is otherwise empty, which is what lets the stage name on the
          left actually register. */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {(running || failed) && (
          <RunStatusBadge running={running} completed={completed} failed={failed} />
        )}
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
          className="hidden items-center rounded-[var(--r-xs)] border-[1.5px] border-[var(--line)]/45 bg-transparent px-2 py-1 font-mono text-[10px] font-bold text-[var(--ink-2)] transition-colors hover:border-[var(--line)] hover:bg-[var(--yellow)] hover:text-[#0a0a0a] xl:flex"
          aria-label="Open command palette"
        >
          ⌘K
        </button>

        <MainNav className="hidden sm:flex" />

        <span className="mx-0.5 hidden h-5 w-[2px] bg-[var(--line)]/30 sm:inline-block" aria-hidden />

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
  let cls = 'bg-[var(--card)] text-[var(--ink-2)]'

  if (running) {
    label = 'Running'
    icon = <Loader2 className="size-3 animate-spin" />
    cls = 'bg-[var(--yellow)] text-[#0a0a0a]'
  } else if (failed) {
    label = 'Failed'
    icon = <X className="size-3" />
    cls = 'bg-[var(--red)] text-white'
  } else if (completed) {
    label = 'Done'
    icon = <Check className="size-3" />
    cls = 'bg-[var(--ink)] text-[var(--paper)]'
  }

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-[var(--r-xs)] border-[1.5px] border-[var(--line)] px-2 py-[3px] font-mono text-[9px] font-bold uppercase leading-none tracking-[0.14em]',
        cls,
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </span>
  )
}
