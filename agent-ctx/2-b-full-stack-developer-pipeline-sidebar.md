# Task 2-b — full-stack-developer (Pipeline Sidebar + App Shell)

Work record for the AR2-DDCQG pipeline sidebar + app shell. See
`/home/z/my-project/worklog.md` for the cross-agent summary.

## Files created (all in `src/components/layout/`)

- `StageStatusDot.tsx` — reusable presentational status indicator.
  Props: `{ status: StageStatus; size?: 'sm' | 'md'; className?: string }`.
  Renders idle (hollow muted circle), running (pulsing emerald ring + spinning
  border-top ring + center pip), done (solid emerald check), flagged (amber
  triangle with subtle opacity pulse), error (coral/red X). Uses
  `useReducedMotion()` to skip animations. All animation via framer-motion
  (no CSS keyframes added to globals.css — kept that file untouched).

- `SidebarStageItem.tsx` — single nav row. Props:
  `{ stage: StageMeta; collapsed: boolean; variant?: 'rail' | 'sheet' }`.
  Exports `STAGE_ICON: Record<StageId, LucideIcon>` (Upload / ScanEye /
  Sparkles / MessageSquareQuote / ShieldCheck / ListChecks). Reads
  `activeStage`, `stages[stage.id]`, `setActiveStage` from the store.
  - Active stage gets a glass panel (`glass glow-accent`) + left emerald
    accent bar, animated with framer-motion `layoutId="active-stage-panel"`
    (rail) / `"active-stage-panel-sheet"` (sheet) so it slides between rows.
  - Click guard: enabled when `stage.id === 'upload' || status !== 'idle'`.
    Idle future stages show a `Lock` icon, reduced opacity, and
    `cursor-not-allowed`. Uses `aria-disabled` (not the `disabled` attr) so
    the collapsed-state Tooltip still fires on hover/focus.
  - Collapsed layout: centered stage icon + status pip top-right + lock
    bottom-right; tooltip on hover (right side) with label + agent.
  - Expanded layout: status dot + (label / agent) + trailing affordance.

- `PipelineSidebar.tsx` — the sidebar. Exports `PipelineSidebar`.
  Props: `{ collapsed: boolean; variant?: 'rail' | 'sheet' }`.
  - `variant="rail"` (default): renders a `motion.aside` whose width animates
    between 280px (expanded) and 64px (collapsed) via framer-motion
    `animate={{ width }}`. `hidden lg:flex lg:sticky lg:top-0 lg:h-screen
    lg:self-start` — desktop-only, sticky left rail.
  - `variant="sheet"`: renders bare `SidebarContent` for use inside the
    mobile Sheet drawer (AppShell owns the Sheet state).
  - `SidebarContent`:
    - Header: `Hexagon` mark + "AR2-DDCQG" (mono, 13px, semibold) + "v0.1"
      pill. Collapses to just the Hexagon mark.
    - Nav: `STAGES` mapped to `SidebarStageItem`. Expanded-only progress
      connector line down the left edge (`left-[22px]`) — a 1px track with
      an animated emerald fill whose height = `progress * 100%`.
      `computeProgress()` returns `(lastDoneOrRunningIndex + 1) /
      STAGE_ORDER.length`.
    - "Pipeline running — collapse the rail to focus." hint card
      (AnimatePresence) appears below the nav while `running && !collapsed`.
    - Run block (expanded only): bloom-level pill colored by
      `BLOOM_META[level].hue` (inline `color`/`borderColor`/
      `backgroundColor` via `color-mix`), truncated run id (mono, e.g.
      `abc123…de4f`), run status with spinner/check/X, error message line.
    - Footer (rail variant only): collapse toggle button (chevron left/right
      + "Collapse" label).

- `TopBar.tsx` — slim sticky top bar. Exports `TopBar`.
  Props: `{ onOpenMobileSidebar?: () => void }`.
  - `glass-strong sticky top-0 z-30 h-12 border-b border-border/60`.
  - Left: mobile Menu button (`lg:hidden`, calls `onOpenMobileSidebar`) +
    active stage label (animated key-swap on `activeStage`) + agent name
    (hidden on `< sm`).
  - Right cluster: bloom-level pill (colored by `BLOOM_META[level].hue`,
    hidden on `< sm`), run status badge (Idle/Running/Failed/Done with
    icon, label hidden on `< sm`), LIVE pill (emerald, pulsing dot, only
    while `running`), run id mono (hidden on `< md`), New-run button
    (`RotateCcw`, `disabled={running}`, with Tooltip).
  - `RunStatusBadge` internal helper handles the four states.

- `AgentLogRail.tsx` — collapsible live log rail. Exports `AgentLogRail`.
  - `fixed bottom-4 right-4 z-40` floating cluster. Default collapsed to a
    small `Terminal` toggle button (with `Log` label on `sm+` and a
    pinging emerald dot when logs exist). Tooltip on the toggle.
  - Expanded: `glass-strong` panel, `w-[min(560px,calc(100vw-2rem))]`,
    header with `Terminal` icon + "AGENT LOG" + count badge + collapse
    chevron, body `max-h-72 overflow-y-auto scroll-slim`.
  - Each `LogRow`: timestamp (mono HH:MM:SS, muted) + stage tag (colored
    by `STAGE_COLOR`: slate/emerald/amber/teal/coral/emerald — no blue) +
    level icon (Info/AlertTriangle/X/Check) + text. `role="log"
    aria-live="polite"`.
  - Empty state: "No agent activity yet." centered muted placeholder.
  - Expand/collapse via framer-motion `AnimatePresence` (opacity + y +
    scale, 0.22s ease `[0.22, 1, 0.36, 1]`).

- `AppShell.tsx` — the shell. Exports `AppShell`.
  Signature: `export function AppShell({ children }: { children: React.ReactNode })`.
  - Root: `<section id="console" className="relative flex min-h-screen flex-col bg-background">`.
    This is the hero "Begin" scroll target.
  - Top hairline: 1px emerald gradient thread along the very top edge
    (`via-emerald-500/30`), `z-40`, `pointer-events-none`.
  - Inner row: `flex flex-1` containing the desktop `PipelineSidebar`
    (rail), the mobile `Sheet` (left side, 280px), and the main column
    (`flex min-w-0 flex-1 flex-col`).
  - Main column: `TopBar` (sticky) + `<main className="relative flex-1">`.
    Inside main: `grid-faint` background layer (`opacity-[0.035]`) + top
    radial emerald glow (`radial-gradient` via `color-mix` on
    `var(--primary)`) + children (wrapped `relative z-10`) + `AgentLogRail`.
  - Mobile Sheet: `side="left"`, `w-[280px] p-0 gap-0`, includes an
    sr-only `SheetTitle` ("Pipeline navigation") for Radix Dialog a11y.
    The Sheet state (`mobileOpen`) is owned by AppShell; the open
    callback is passed to `TopBar` via `onOpenMobileSidebar`.

## Design decisions

- **No new CSS keyframes**: the `running` dot's spinning ring uses
  framer-motion `animate={{ rotate: 360 }}` (linear, 0.8s, infinite) so I
  didn't have to touch `globals.css`. The `useReducedMotion()` hook
  disables both the pulse and the spin for users who prefer reduced motion.
- **Sticky sidebar + sticky TopBar**: the `motion.aside` is
  `lg:sticky lg:top-0 lg:h-screen lg:self-start`. The AppShell's inner row
  is plain `flex flex-1` (NO `overflow-hidden`) so sticky positioning
  works. The TopBar is `sticky top-0` inside the main column. Both pin to
  the viewport top as the page scrolls.
- **`layoutId` for the active panel**: the active stage's glass panel
  uses `motion.span` with `layoutId="active-stage-panel"` (rail) or
  `"active-stage-panel-sheet"` (sheet). When `activeStage` changes, the
  panel slides between rows with a spring (stiffness 380, damping 32).
  The layoutId is namespaced per variant so the rail and the Sheet don't
  fight over the same id if both were mounted.
- **Disabled state uses `aria-disabled`, not `disabled`**: this keeps the
  button focusable and lets the collapsed-state Tooltip fire on hover
  even for idle future stages. The click handler guards against
  activation. Reduced opacity + `cursor-not-allowed` + `Lock` icon convey
  the locked state visually.
- **Bloom pill colors**: uses `BLOOM_META[level].hue` (an `oklch()`
  string) via inline `style`. `borderColor` and `backgroundColor` use
  `color-mix(in oklch, ${hue} 35%/12%, transparent)` so the pill tints
  with the bloom level without needing a per-level Tailwind class.
- **Stage log tag colors**: `STAGE_COLOR` map uses rgb() values
  (slate-400 / emerald-400 / amber-400 / teal-400 / coral-rose-400 /
  emerald-400). Teal-400 for the Answering stage was a deliberate choice
  to stay inside the emerald/amber/coral palette — NO blue.
- **Log rail is `fixed`**: the panel floats at `bottom-4 right-4` of the
  viewport (not `absolute` within main, since main grows with content and
  would push an absolute rail off-screen). It's default-collapsed (just a
  small toggle button), so it's unobtrusive even when scrolled onto the
  hero section. If the orchestrator wants it scoped strictly to the
  console, that's a one-line change to `absolute` + a `min-h` on main —
  flagging here.
- **Color policy honored**: emerald primary throughout (`emerald-400/500`
  for status dots, accent bars, LIVE pill, progress line, glow), amber
  for flagged, coral/red (`red-400/500`) for error, teal-400 for the
  answering stage tag. NO indigo, NO blue. All structural colors use
  Tailwind theme tokens (`bg-background`, `text-foreground`,
  `text-muted-foreground`, `border-border`, `bg-card`, `bg-sidebar`,
  `bg-accent`, `bg-muted`) so the shell adapts to the dark-first theme
  (and would adapt to a light theme if one is ever added).
- **Dense spacing rhythm**: 4 / 8 / 12 / 16 / 24px throughout
  (`gap-1`=4, `gap-2`=8, `px-3`=12, `px-4`=16, `py-3`=12, `h-12`=48,
  `h-14`=56). Sidebar items are `px-3 py-2.5` (12/10). TopBar is `h-12`
  (48px). Sidebar header `h-14` (56px). Sidebar footer `h-12` (48px).
- **Mobile**: sidebar is `hidden lg:flex` (rail) on desktop. On `< lg`,
  the AppShell mounts a `Sheet` (side="left", 280px) containing a
  `variant="sheet"` `PipelineSidebar`. The trigger is a `Menu` icon
  button in the TopBar (`lg:hidden`), wired via the `onOpenMobileSidebar`
  prop. The Sheet includes an sr-only `SheetTitle` for Radix Dialog
  accessibility (otherwise Radix warns).

## Lint / type check

- `bun run lint` — 0 errors, 0 warnings (only my files; pre-existing
  errors in `examples/`, `skills/`, `src/lib/store.ts` were NOT touched,
  per the "do not mutate types/store/bloom" rule).
- `bunx tsc --noEmit` — 0 errors in `src/components/layout/*`. (Same
  pre-existing errors outside scope remain.)
- Dev server compiles cleanly (verified via `dev.log`).

## Integration notes for the orchestrator

1. **Import & mount**:
   ```tsx
   import { AppShell } from '@/components/layout/AppShell'
   // ...
   <AppShell>{renderActiveStage()}</AppShell>
   ```
   `renderActiveStage()` should return the stage component for the
   current `activeStage` from `usePipelineStore`. AppShell renders
   `<section id="console">` as its root — the hero's "Begin" button
   already targets `#console` for smooth-scroll.

2. **Page layout suggestion** (matches what 2-a's hero expects):
   ```tsx
   <>
     <Hero3D />
     <AppShell>{renderActiveStage()}</AppShell>
     <Footer />   {/* optional page footer — sits after #console */}
   </>
   ```
   AppShell is `min-h-screen flex flex-col`, so on short content the
   footer sits at the bottom of the viewport (standard sticky-footer
   pattern via the `min-h-screen` on the section).

3. **Store contract consumed** (read-only — no mutations to the store):
   `activeStage`, `stages`, `bloomLevel`, `runId`, `running`,
   `completed`, `failed`, `errorMessage`, `logs`, `sidebarCollapsed`,
   `setActiveStage`, `setSidebarCollapsed`, `resetRun`.

4. **No new routes, no page.tsx changes, no globals.css changes, no new
   packages.** All shadcn/ui usage is from existing components
   (`Button`, `Tooltip`, `Sheet`).

5. **Stage components** (built by other agents) are rendered inside
   `<div className="relative z-10">{children}</div>` within `<main>`. The
   main has a faint `grid-faint` background at 3.5% opacity and a top
   radial emerald glow — stage components should use `bg-card`/`bg-card/40`
   for any panels they render so they sit cleanly on top.

6. **`STAGE_ICON`** is exported from `SidebarStageItem.tsx` if other
   agents want to reuse the stage→icon mapping (e.g., in stage headers).
