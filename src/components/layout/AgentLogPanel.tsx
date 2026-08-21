'use client'

/**
 * AgentLogPanel — the live agent log, as dock content.
 *
 * This was `AgentLogRail`: a floating widget with its own toggle button
 * pinned over the bottom-right of the page. The rail and its button are
 * gone; the dock owns opening and closing now, so this file is only the
 * stream itself.
 */

import * as React from 'react'
import { Info, AlertTriangle, X, Check } from 'lucide-react'
import { usePipelineStore } from '@/lib/store'
import type { StageId, LogLine } from '@/lib/types'

const STAGE_TAG: Record<StageId, string> = {
  upload: 'upload',
  extraction: 'extract',
  generation: 'generate',
  answering: 'answer',
  verification: 'verify',
  results: 'results',
}

/** One Bloom-spectrum hue per stage, so the log reads as a colour ladder. */
const STAGE_COLOR: Record<StageId, string> = {
  upload: 'var(--ink-2)',
  extraction: 'var(--bloom-1)',
  generation: 'var(--bloom-3)',
  answering: 'var(--bloom-2)',
  verification: 'var(--bloom-5)',
  results: 'var(--red)',
}

function levelIcon(level: LogLine['level']) {
  switch (level) {
    case 'error':
      return <X className="size-3 text-[var(--red)]" strokeWidth={3} />
    case 'warn':
      return <AlertTriangle className="size-3 text-[var(--bloom-5)]" strokeWidth={2.5} />
    case 'success':
      return <Check className="size-3 text-[var(--bloom-2)]" strokeWidth={3} />
    default:
      return <Info className="size-3 text-[var(--ink-2)]" strokeWidth={2.5} />
  }
}

export function AgentLogPanel() {
  const logs = usePipelineStore((s) => s.logs)
  const running = usePipelineStore((s) => s.running)
  const endRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [logs.length])

  return (
    <div className="flex h-full flex-col">
      <div
        className="scroll-slim min-h-0 flex-1 overflow-y-auto px-2 py-2 font-mono text-[11px] leading-relaxed"
        role="log"
        aria-live="polite"
      >
        {logs.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-2)]">
              No agent activity yet
            </span>
            <p className="text-[11px] leading-relaxed text-[var(--ink-2)]">
              Start a run and the agents narrate their work here, line by line.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col">
            {logs.map((line) => (
              <LogRow key={line.id} line={line} />
            ))}
            <div ref={endRef} />
          </ul>
        )}
      </div>

      <footer className="flex h-8 shrink-0 items-center justify-between border-t-2 border-[var(--line)] px-3">
        <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--ink-2)]">
          {logs.length} line{logs.length === 1 ? '' : 's'}
        </span>
        <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--ink-2)]">
          <span
            className={`size-1.5 rounded-full ${running ? 'bg-[var(--red)]' : 'bg-[var(--ink-2)]'}`}
            aria-hidden
          />
          {running ? 'streaming' : 'idle'}
        </span>
      </footer>
    </div>
  )
}

function LogRow({ line }: { line: LogLine }) {
  const color = STAGE_COLOR[line.stage]
  return (
    <li className="flex items-start gap-2 border-b border-dashed border-[var(--line)]/20 px-1 py-1">
      <span className="shrink-0 select-none text-[10px] text-[var(--ink-2)]">
        {formatTime(line.timestamp)}
      </span>
      <span
        className="shrink-0 select-none border px-1 py-px text-[9px] font-bold uppercase leading-none tracking-wide"
        style={{
          color: 'var(--ink)',
          backgroundColor: `color-mix(in srgb, ${color} 30%, transparent)`,
          borderColor: color,
        }}
      >
        {STAGE_TAG[line.stage]}
      </span>
      <span className="mt-[2px] shrink-0">{levelIcon(line.level)}</span>
      <span className="min-w-0 flex-1 break-words text-[var(--ink)]">{line.text}</span>
    </li>
  )
}

function formatTime(ts: number): string {
  try {
    const d = new Date(ts)
    return [d.getHours(), d.getMinutes(), d.getSeconds()]
      .map((n) => String(n).padStart(2, '0'))
      .join(':')
  } catch {
    return '--:--:--'
  }
}
