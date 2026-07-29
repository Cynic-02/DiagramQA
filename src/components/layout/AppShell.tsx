'use client'

import * as React from 'react'
import { usePipelineStore } from '@/lib/store'
import { PipelineSidebar } from './PipelineSidebar'
import { TopBar } from './TopBar'
import { AgentLogRail } from './AgentLogRail'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'

/**
 * App shell wrapping the console section of the single `/` page.
 *
 * Renders `<section id="console">` as its root — the hero's "Begin" button
 * smooth-scrolls to this anchor. Inside: a sticky left pipeline sidebar
 * (desktop) / off-canvas Sheet drawer (mobile) + a main content column with
 * a sticky `TopBar` and the live `AgentLogRail` floating bottom-right.
 *
 * The orchestrator's page mounts it as:
 *
 * ```tsx
 * <AppShell>{renderActiveStage()}</AppShell>
 * ```
 *
 * where `renderActiveStage()` returns the stage component for the current
 * `activeStage` from the store. The shell is `min-h-screen flex flex-col` so
 * a page-level footer (rendered by the orchestrator as a sibling AFTER the
 * shell) sits at the bottom of the viewport when content is short.
 */
export function AppShell({
  children,
  footer,
}: {
  children: React.ReactNode
  /**
   * Page footer, rendered INSIDE the main column.
   *
   * It used to be a sibling after <AppShell>, which meant the flex row
   * holding the sticky rail ended above it. A `sticky top-0 h-screen`
   * element stops sticking once its containing block's bottom scrolls
   * past, so near the page bottom the rail detached and its footer
   * (Run box, Collapse) visibly slid upward. Putting the page footer in
   * the main column extends the row to the full document height, so the
   * rail stays put all the way down.
   */
  footer?: React.ReactNode
}) {
  const sidebarCollapsed = usePipelineStore((s) => s.sidebarCollapsed)
  const [mobileOpen, setMobileOpen] = React.useState(false)

  return (
    <section
      id="console"
      className="relative flex min-h-screen flex-col bg-background bg-gradient-to-b from-primary/[0.04] to-background"
    >
      {/* Top hairline accent — solid flat border, not a gradient thread */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-40 h-1 bg-primary"
      />

      <div className="flex flex-1">
        {/* Desktop fixed rail (sticky on lg+) */}
        <PipelineSidebar collapsed={sidebarCollapsed} variant="rail" />

        {/* Mobile off-canvas drawer */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            side="left"
            className="w-[280px] gap-0 border-border bg-sidebar p-0 sm:max-w-[280px]"
          >
            <SheetTitle className="sr-only">Pipeline navigation</SheetTitle>
            <PipelineSidebar collapsed={false} variant="sheet" />
          </SheetContent>
        </Sheet>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar onOpenMobileSidebar={() => setMobileOpen(true)} />

          <main className="relative flex-1">
            {/* Background: faint flat grid only — no atmospheric glow */}
            <div
              aria-hidden
              className="grid-faint pointer-events-none absolute inset-0 opacity-[0.035]"
            />

            {/* Active stage content (provided by the orchestrator) */}
            <div className="relative z-10">{children}</div>

            {/* Floating live log rail */}
            <AgentLogRail />
          </main>

          {footer}
        </div>
      </div>
    </section>
  )
}
