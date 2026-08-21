'use client'

import * as React from 'react'
import { usePipelineStore } from '@/lib/store'
import { PipelineSidebar } from './PipelineSidebar'
import { TopBar } from './TopBar'
import { ConsoleDock } from './ConsoleDock'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'

/**
 * App shell for the console.
 *
 * THE FRAME
 * ---------
 * The shell is locked to the viewport (`h-screen`, `overflow-hidden`) and
 * every region inside it is a flex child that manages its own scrolling.
 * The document itself never scrolls, so the sidebar, the top bar, the
 * dock and the status strip are always where you left them and only the
 * content pane moves. Stages are handed a fixed-height box and are
 * expected to fill it — `StageFrame` does that for the ones that don't
 * lay themselves out.
 *
 * Three columns: pipeline rail, content, dock. The dock replaces the two
 * floating widgets (agent log, follow-up chat) that used to sit on top of
 * the content in the bottom-right corner; it takes its width out of the
 * layout instead of covering anything.
 */
export function AppShell({
  children,
  footer,
}: {
  children: React.ReactNode
  /** Thin status strip pinned to the bottom of the content column. */
  footer?: React.ReactNode
}) {
  const sidebarCollapsed = usePipelineStore((s) => s.sidebarCollapsed)
  const [mobileOpen, setMobileOpen] = React.useState(false)

  return (
    <section id="console" className="relative flex h-screen flex-col overflow-hidden">
      {/* Top hairline accent — solid flat border, not a gradient thread */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-40 h-1 bg-[var(--red)]"
      />

      <div className="flex min-h-0 flex-1">
        {/* Desktop pipeline rail */}
        <PipelineSidebar collapsed={sidebarCollapsed} variant="rail" />

        {/* Mobile off-canvas drawer */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            side="left"
            className="w-[280px] gap-0 border-[var(--line)] bg-[var(--card)] p-0 sm:max-w-[280px]"
          >
            <SheetTitle className="sr-only">Pipeline navigation</SheetTitle>
            <PipelineSidebar collapsed={false} variant="sheet" />
          </SheetContent>
        </Sheet>

        {/* Content column */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <TopBar onOpenMobileSidebar={() => setMobileOpen(true)} />
          <main className="relative min-h-0 flex-1 overflow-hidden">{children}</main>
          {footer}
        </div>

        {/* Right dock: agent log + follow-up chat */}
        <ConsoleDock />
      </div>
    </section>
  )
}
