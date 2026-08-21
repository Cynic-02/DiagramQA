'use client'

/**
 * ConsoleDock — the right-hand rail.
 *
 * The agent log and the follow-up chatbot were two separate floating
 * widgets pinned to the bottom-right corner. Two overlays competing for
 * one corner meant they covered the content, covered each other, and had
 * no fixed home you could learn.
 *
 * They are now one docked column with two tabs. Collapsed it is a 46px
 * strip of vertical tabs — chrome, not an overlay. Expanded it takes its
 * own width out of the layout so the page reflows beside it rather than
 * being hidden under it. Nothing in the console floats any more.
 */

import * as React from 'react'
import { motion } from 'framer-motion'
import { Terminal, MessageSquare, PanelRightClose } from 'lucide-react'
import { usePipelineStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { AgentLogPanel } from './AgentLogPanel'
import { ChatPanel } from '@/components/chat-panel'

const OPEN_WIDTH = 372
const RAIL_WIDTH = 46

export function ConsoleDock() {
  const dockOpen = usePipelineStore((s) => s.dockOpen)
  const dockTab = usePipelineStore((s) => s.dockTab)
  const toggleDock = usePipelineStore((s) => s.toggleDock)
  const setDock = usePipelineStore((s) => s.setDock)
  const logs = usePipelineStore((s) => s.logs)
  const runId = usePipelineStore((s) => s.runId)
  const finalQA = usePipelineStore((s) => s.finalQA)

  const chatReady = finalQA.length > 0 && !!runId

  return (
    <motion.aside
      initial={false}
      animate={{ width: dockOpen ? OPEN_WIDTH + RAIL_WIDTH : RAIL_WIDTH }}
      transition={{ type: 'spring', stiffness: 340, damping: 38 }}
      aria-label="Console dock"
      className="relative z-20 hidden shrink-0 border-l-[3px] border-[var(--line)] bg-[var(--card)] lg:flex"
    >
      {/* ---- panel ---- */}
      <div
        className="flex min-w-0 flex-1 flex-col overflow-hidden"
        style={{ width: dockOpen ? OPEN_WIDTH : 0 }}
        aria-hidden={!dockOpen}
      >
        {dockOpen && (
          <>
            <header className="flex h-11 shrink-0 items-center gap-2 border-b-[3px] border-[var(--line)] bg-[var(--ink)] px-3">
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--paper)]">
                {dockTab === 'log' ? 'Agent log' : 'Follow-up'}
              </span>
              {dockTab === 'log' && logs.length > 0 && (
                <span className="border-2 border-[var(--paper)]/40 px-1.5 py-px font-mono text-[10px] font-bold text-[var(--paper)]">
                  {logs.length}
                </span>
              )}
              <button
                type="button"
                onClick={() => setDock(false)}
                aria-label="Close dock"
                className="ml-auto inline-flex size-7 items-center justify-center text-[var(--paper)]/60 transition-colors hover:text-[var(--paper)]"
              >
                <PanelRightClose className="size-4" />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-hidden">
              {dockTab === 'log' ? <AgentLogPanel /> : <ChatPanel />}
            </div>
          </>
        )}
      </div>

      {/* ---- vertical tab strip ---- */}
      <div
        className={cn(
          'flex w-[46px] shrink-0 flex-col items-center gap-2 py-3',
          dockOpen && 'border-l-[3px] border-[var(--line)]',
        )}
      >
        <DockTab
          label="Log"
          icon={<Terminal className="size-4" />}
          active={dockOpen && dockTab === 'log'}
          badge={logs.length > 0}
          onClick={() => toggleDock('log')}
        />
        <DockTab
          label="Chat"
          icon={<MessageSquare className="size-4" />}
          active={dockOpen && dockTab === 'chat'}
          badge={chatReady}
          onClick={() => toggleDock('chat')}
        />
      </div>
    </motion.aside>
  )
}

function DockTab({
  label,
  icon,
  active,
  badge,
  onClick,
}: {
  label: string
  icon: React.ReactNode
  active: boolean
  badge?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={label}
      className={cn(
        'relative flex w-[34px] flex-col items-center gap-2 border-2 border-[var(--line)] py-3',
        'transition-[background-color,color] duration-[90ms] ease-[cubic-bezier(.2,0,0,1)]',
        active
          ? 'bg-[var(--red)] text-white'
          : 'bg-[var(--card)] text-[var(--ink-2)] hover:bg-[var(--yellow)] hover:text-[#0a0a0a]',
      )}
    >
      {icon}
      <span
        className="font-mono text-[10px] font-bold uppercase tracking-[0.18em]"
        style={{ writingMode: 'vertical-rl' }}
      >
        {label}
      </span>
      {badge && !active && (
        <span
          className="absolute right-[3px] top-[3px] size-1.5 rounded-full bg-[var(--red)]"
          aria-hidden
        />
      )}
    </button>
  )
}
