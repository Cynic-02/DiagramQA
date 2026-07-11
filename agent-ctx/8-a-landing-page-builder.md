# Task 8-A — Landing Page Builder

**Agent:** full-stack-developer
**Task:** Build the marketing landing page at `/` (hero + features + how-it-works + CTA + footer) for the AR2-DDCQG multi-page product split.

## What I built

Overwrote `src/app/page.tsx` (default export `LandingPage`, `'use client'`). Five sections:

1. **Hero** — `<Hero3D onEnterConsole={() => { window.location.href = '/login' }} />`, lazy-loaded via `next/dynamic({ ssr:false })` with spinner fallback. The hero's "Begin" CTA routes to `/login`.
2. **Features** (`#features`) — "Six agents, *one pipeline*." heading (`.text-gradient` on "one pipeline"). `StaggerContainer`/`StaggerItem` grid of 6 glass cards (`1 → 2 → 3 cols`). Each card: faint number 01–06 top-right, icon chip top-left, title, description, hover-reveal gradient accent line. Icons per spec: Eye, Sparkles, PenLine, ShieldCheck, Lock, Zap.
3. **How It Works** (`#how-it-works`) — "Six steps to *results*." heading (`.text-gradient-warm`). Vertical timeline with a single gradient connecting line down the left rail. 6 steps (Upload → Extract → Generate → Answer → Verify → Export), each with a numbered/icon circle on the timeline + a glass card containing eyebrow/title/description/3-bullet grid.
4. **CTA** (`#get-started`) — "Start building *today*." (`.text-gradient`). Big `glass-strong` panel with multi-radial gradient glow (emerald + coral) + `.grid-faint` texture. Primary `<MagneticButton>` "Get started →" → `/login`, secondary "Explore the pipeline" → `#features`.
5. **Footer** (`mt-auto`) — gradient brand mark "AR2-DDCQG · v1.0" + tagline + agent legend (Extraction/Generation/Answering/Verification with emerald/amber/orange/rose dots).

Global layers mounted at the page root: `<AmbientOrbs />`, `<CustomCursor />`, `<ScrollProgress />` (these were on the old single-page app; the layout only mounts ThemeProvider + Toaster + grain overlay).

## Design system adherence

- Dark theme default, emerald primary, coral/amber/teal accents only. **NO indigo/blue/purple.** Hue values used: 162 (emerald), 195 (teal), 95/75 (amber), 25 (coral).
- Premium utilities from `globals.css`: `.glass`, `.glass-strong`, `.text-gradient`, `.text-gradient-warm`, `.grid-faint`, `.text-balance`, `.text-pretty`.
- Spacing rhythm: sections `py-24 sm:py-32`, grids `gap-5 sm:gap-6`, heading-to-grid `mt-16 sm:mt-20`.
- Typography: mono eyebrow chips with `tracking-[0.18em]` uppercase; balanced/pretty text wrapping on headings/body.
- `RevealOnScroll` on every heading block; `StaggerContainer`/`StaggerItem` on both grids. All respect `prefers-reduced-motion`.

## Layout & accessibility

- Root: `relative flex min-h-screen flex-col bg-background`. Content column: `relative z-10 flex flex-1 flex-col`. Footer: `mt-auto` — sticky-bottom compliant, natural push on overflow.
- Semantic `<section>`/`<article>`/`<footer>`, `aria-labelledby` on every section, `aria-label` on the primary CTA, `aria-hidden` on all decorative layers (orbs, glows, grid textures, connector line).
- Mobile-first responsive: `sm:` and `lg:` breakpoints; touch-friendly 44px+ targets.

## Frozen files respected

Did NOT touch `src/lib/*`, `src/components/three/*`, `src/app/globals.css`, or `src/app/layout.tsx`. Only overwrote `src/app/page.tsx`. Did NOT import AppShell, sidebar, console, stages, store, or socket — this page is purely presentational.

## Verification

- `bun run lint` — clean (0 errors, 0 warnings).
- `dev.log` — `GET / 200` after the rewrite, compiles cleanly.
- TypeScript strict, no `any`. `LucideIcon` type for icon fields.

## Decisions for downstream agents

- **`/` is now a pure marketing landing page** — no AppShell, no socket, no store. The hero's "Begin" + CTA's "Get started" both route to `/login`.
- **`onEnterConsole` is reused as the "primary CTA clicked" hook** — its name is a misnomer now (frozen Hero3D contract), but it fires last in Hero3D's `handleBegin` so navigation wins.
- **Section IDs** `#features`, `#how-it-works`, `#get-started` are stable anchors.
- **Global layers (AmbientOrbs, CustomCursor, ScrollProgress) are page-level here**, not in layout. If `/login` and `/app` want them, they must mount them too (or a future refactor lifts them into `layout.tsx`).
- The hero's "Scroll to enter the console ↓" hint still renders (cosmetic only — there's no console below the hero anymore; scrolling reveals the features section). Tweaking it would require touching the frozen `src/components/three/Hero3D.tsx`, out of scope.
