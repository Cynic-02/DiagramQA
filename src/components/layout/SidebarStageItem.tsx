'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import {
  Upload,
  ScanEye,
  Sparkles,
  MessageSquareQuote,
  ShieldCheck,
  ListChecks,
  Lock,
  type LucideIcon,
} from 'lucide-react'
import type { StageId, StageMeta } from '@/lib/types'
import { usePipelineStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'
import { StageStatusDot } from './StageStatusDot'
import { ShaderIcon } from '@/components/shader-icons'

/** Stage icon map (brutalist flat-tint, brand-consistent). */
export const STAGE_ICON: Record<StageId, LucideIcon> = {
  upload: Upload,
  extraction: ScanEye,
  generation: Sparkles,
  answering: MessageSquareQuote,
  verification: ShieldCheck,
  results: ListChecks,
}

interface SidebarStageItemProps {
  stage: StageMeta
  collapsed: boolean
  /** When rendered inside the mobile Sheet drawer, we drop the active-panel
   * layout animation (only one rail is visible at a time on desktop). */
  variant?: 'rail' | 'sheet'
}

/**
 * A single pipeline stage nav row inside the sidebar.
 *
 * - The active stage receives a glass panel + glow + left emerald accent bar.
 *   The panel uses framer-motion `layoutId="active-stage-panel"` so it slides
 *   smoothly between rows when the active stage changes.
 * - Items are clickable when the stage has been started (status !== 'idle')
 *   OR it's the upload stage (always enabled). Idle future stages get a small
 *   lock icon, reduced opacity and `cursor-not-allowed`.
 */
export function SidebarStageItem({
  stage,
  collapsed,
  variant = 'rail',
}: SidebarStageItemProps) {
  const activeStage = usePipelineStore((s) => s.activeStage)
  const stageState = usePipelineStore((s) => s.stages[stage.id])
  const setActiveStage = usePipelineStore((s) => s.setActiveStage)

  const isActive = activeStage === stage.id
  const status = stageState.status
  const enabled = stage.id === 'upload' || status !== 'idle'

  const Icon = STAGE_ICON[stage.id]
  const layoutId = variant === 'rail' ? 'active-stage-panel' : 'active-stage-panel-sheet'

  const handleClick = () => {
    if (!enabled) return
    setActiveStage(stage.id)
  }

  // ---- Collapsed (icon rail) ----
  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={handleClick}
            aria-current={isActive ? 'page' : undefined}
            aria-disabled={!enabled || undefined}
            aria-label={stage.label}
            className={cn(
              'group relative flex h-10 w-full items-center justify-center rounded-[var(--radius)] transition-colors',
              isActive
                ? 'text-primary-foreground'
                : enabled
                ? 'text-muted-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent'
                : 'cursor-not-allowed text-muted-foreground/40',
            )}
          >
            {isActive && (
              <motion.span
                layoutId={layoutId}
                className={cn(
                  "absolute inset-0 rounded-[var(--radius)] border border-primary/30 bg-primary/10 shadow-sm",
                  status === 'running' && "animate-pulse border-primary/50 shadow-[var(--sidebar-active-glow)]"
                )}
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              />
            )}
            {isActive ? (
              <ShaderIcon icon={Icon} size={18} colorTint="var(--primary)" speed={0.4} />
            ) : (
              <Icon className="relative size-[18px]" strokeWidth={2} />
            )}
            {/* Status pip in the corner */}
            <span className="absolute -right-0.5 -top-0.5">
              <StageStatusDot status={status} size="sm" />
            </span>
            {!enabled && (
              <Lock className="absolute bottom-0.5 right-0.5 size-2.5 text-muted-foreground/60" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          <span className="font-bold">{stage.label}</span>
          <span className="ml-1.5 opacity-80">· {stage.agent}</span>
        </TooltipContent>
      </Tooltip>
    )
  }

  // ---- Expanded ----
  return (
    <button
      type="button"
      onClick={handleClick}
      aria-current={isActive ? 'page' : undefined}
      aria-disabled={!enabled || undefined}
      className={cn(
        'group relative flex w-full items-center gap-3 rounded-[var(--radius)] px-3 py-2.5 text-left transition-colors',
        !isActive && enabled && 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        !isActive && !enabled && 'cursor-not-allowed opacity-55',
      )}
    >
      {isActive && (
        <motion.span
          layoutId={layoutId}
          className={cn(
            "absolute inset-0 rounded-[var(--radius)] border border-primary/30 bg-primary/10 shadow-sm",
            status === 'running' && "animate-pulse border-primary/50 shadow-[var(--sidebar-active-glow)]"
          )}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        />
      )}

      {/* Status dot / icon */}
      <span className="relative flex size-5 shrink-0 items-center justify-center">
        <StageStatusDot status={status} size="md" />
      </span>

      {/* Label + agent */}
      <span className="relative flex min-w-0 flex-1 flex-col">
        <span
          className={cn(
            'truncate text-[13px] font-bold leading-tight',
            isActive ? 'text-primary' : 'text-foreground',
          )}
        >
          {stage.label}
        </span>
        <span className="truncate text-[11px] leading-tight text-muted-foreground">
          {stage.agent}
        </span>
      </span>

      {/* Trailing affordances */}
      <span className="relative flex shrink-0 items-center">
        {!enabled && <Lock className="size-3 text-muted-foreground/60" />}
        {enabled && !isActive && status === 'idle' && (
          <Icon className="size-3.5 text-muted-foreground/50 group-hover:text-muted-foreground" />
        )}
      </span>
    </button>
  )
}
