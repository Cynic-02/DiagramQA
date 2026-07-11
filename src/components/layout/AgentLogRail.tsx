'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Terminal, Info, AlertTriangle, X, Check, ChevronDown } from 'lucide-react'
import { usePipelineStore } from '@/lib/store'
import { STAGES } from '@/lib/types'
import type { StageId, LogLine } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

const STAGE_COLOR: Record<StageId, string> = {
  upload: 'var(--muted-foreground)',
  extraction: 'var(--primary)',
  generation: 'var(--accent)',
  answering: 'var(--secondary)',
  verification: 'var(--foreground)',
  results: 'var(--primary)',
}

const STAGE_TAG: Record<StageId, string> = {
  upload: 'upload',
  extraction: 'extract',
  generation: 'generate',
  answering: 'answer',
  verification: 'verify',
  results: 'results',
}

function levelIcon(level: LogLine['level']) {
  switch (level) {
    case 'error':
      return <X className="size-3 text-red-400" />
    case 'warn':
      return <AlertTriangle className="size-3 text-amber-400" />
    case 'success':
      return <Check className="size-3 text-primary" />
    default:
      return <Info className="size-3 text-muted-foreground" />
  }
}

/**
 * Collapsible live agent log rail. Floats at the bottom-right of the console
 * content area. Default collapsed to a small terminal toggle button; expands
 * into a glass panel streaming `store.logs`.
 */
export function AgentLogRail() {
  const [open, setOpen] = React.useState(false)
  const logs = usePipelineStore((s) => s.logs)

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
      {/* Expanded panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="log-panel"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="brutal-block pointer-events-auto flex w-[min(560px,calc(100vw-2rem))] flex-col overflow-hidden bg-card"
            role="log"
            aria-live="polite"
            aria-label="Agent activity log"
          >
            {/* Header */}
            <div className="flex h-9 shrink-0 items-center justify-between border-b border-border/40 px-3">
              <div className="flex items-center gap-2">
                <Terminal className="size-3.5 text-primary" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-foreground/80">
                  Agent log
                </span>
                {logs.length > 0 && (
                  <span className="border border-border/70 rounded bg-muted px-1.5 py-px font-mono text-[10px] font-bold text-muted-foreground">
                    {logs.length}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Collapse agent log"
                className="inline-flex size-6 items-center justify-center border border-transparent rounded text-muted-foreground transition-colors hover:border-border/40 hover:bg-accent hover:text-accent-foreground"
              >
                <ChevronDown className="size-3.5" />
              </button>
            </div>

            {/* Body */}
            <div className="max-h-72 overflow-y-auto scroll-slim px-2 py-2 font-mono text-[11.5px] leading-relaxed">
              {logs.length === 0 ? (
                <div className="flex h-20 items-center justify-center px-4 text-center text-[11px] text-muted-foreground/70">
                  No agent activity yet.
                </div>
              ) : (
                <ul className="flex flex-col gap-0.5">
                  {logs.map((line) => (
                    <LogRow key={line.id} line={line} />
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? 'Collapse agent log' : 'Open agent log'}
            className={cn(
              'brutal-block brutal-interactive pointer-events-auto inline-flex h-9 items-center gap-2 bg-card px-3 text-[11px] font-bold text-foreground/80',
              open && 'text-primary',
            )}
          >
            <Terminal className="size-3.5" />
            <span className="hidden sm:inline">Log</span>
            {logs.length > 0 && (
              <span className="thinking-dot relative inline-flex size-1.5 rounded-full bg-primary" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" sideOffset={8}>
          {open ? 'Hide log' : 'Show agent log'}
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function LogRow({ line }: { line: LogLine }) {
  const stageMeta = STAGES.find((s) => s.id === line.stage)
  const color = STAGE_COLOR[line.stage]
  const tag = STAGE_TAG[line.stage]
  const time = formatTime(line.timestamp)

  return (
    <li className="flex items-start gap-2 rounded px-1.5 py-0.5 hover:bg-foreground/[0.03]">
      <span className="shrink-0 select-none text-muted-foreground/60">{time}</span>
      <span
        className="shrink-0 select-none border rounded px-1.5 py-px text-[9.5px] font-bold uppercase leading-none tracking-wide"
        style={{
          color: color,
          backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
          borderColor: `color-mix(in srgb, ${color} 30%, transparent)`,
        }}
      >
        {tag}
      </span>
      <span className="mt-px shrink-0">{levelIcon(line.level)}</span>
      <span className="min-w-0 flex-1 break-words text-foreground/85">{line.text}</span>
      {stageMeta && (
        <span className="sr-only">stage: {stageMeta.label}</span>
      )}
    </li>
  )
}

function formatTime(ts: number): string {
  try {
    const d = new Date(ts)
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    const ss = String(d.getSeconds()).padStart(2, '0')
    return `${hh}:${mm}:${ss}`
  } catch {
    return '--:--:--'
  }
}
