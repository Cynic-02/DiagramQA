'use client'

import { useEffect, useState, type CSSProperties } from 'react'

import { ScrollProgress } from '@/components/scroll-progress'
import { ThemeToggle } from '@/components/theme-toggle'
import { PaletteSwitcher } from '@/components/palette-switcher'
import { smoothScrollTo } from '@/components/SmoothScrollProvider'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { readJourneyTheme, watchJourneyTheme } from '@/lib/journey/theme'

// The hero is now the scroll-linked particle journey: every illustration
// dissolves into red/black/yellow ink and reassembles as the next one.
// Sequence + tuning live in src/config/journey-scenes.ts.
// (Hero3D is kept in the tree — swap it back here to restore the old hero.)
const ScienceJourney = dynamic(
  () => import('@/components/journey/ScienceJourney'),
  {
    ssr: false,
    loading: () => (
      <section
        id="hero"
        aria-busy="true"
        className="relative flex min-h-screen items-center justify-center bg-background"
      >
        <div className="size-8 animate-pulse rounded-full bg-primary" />
      </section>
    ),
  }
)

/* Hidden for now (not deleted) — see the notes where they used to render:
   - GeminiTransition: the Google-Gemini demo effect. Its hardcoded Google
     brand colours over 4 viewports of scroll were the single biggest
     "different website" moment on the page.
   - Strands: a WebGL ribbon demo with off-palette purple/cyan colours.
   - GrainGradientBackground: replaced in the CTA by the palette-driven
     .aurora-mesh so the finale speaks the same colour language as the
     rest of the page.
   Re-add any of them with a dynamic() import plus a <X /> below. */

// Hidden for now (not deleted) — see ParticleMorphScene usage below.
// const ParticleMorphScene = dynamic(() => import('@/components/three/ParticleMorphScene'), {
//   ssr: false,
// })

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

const AGENT_LEGEND = [
  { name: 'Extraction', color: 'bg-primary' },
  { name: 'Generation', color: 'bg-accent' },
  { name: 'Answering', color: 'bg-secondary' },
  { name: 'Verification', color: 'bg-foreground' },
] as const

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function LandingPage() {
  const router = useRouter()

  return (
    <div className="edu-notebook relative flex min-h-screen flex-col bg-hero-void">
      {/* Page-fixed particle field — real 3D instanced particles (not
          flat sprites) that reshape as the page scrolls: brand mark at
          the top, dispersing through the middle, resolving into a
          knowledge-graph glyph at Features, a verified checkmark at the
          CTA, then back to the mark at the footer. Colors are read live
          from the active palette's own tokens. */}
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        {/* HIDDEN FOR NOW — re-enable by uncommenting. Not deleted. */}
        {/* <ParticleMorphScene /> */}
      </div>

      <ScrollProgress />

      {/* Floating theme + palette controls — visible immediately on landing */}
      <div className="fixed right-4 top-4 z-[100] flex items-center gap-2">
        <PaletteSwitcher />
        <ThemeToggle />
      </div>

      {/* Journey sits OUTSIDE the z-10 wrapper on purpose: its own
          sections paint at z-30, above the portalled particle canvas at
          z-20, so text is never covered by the cloud. */}
      <ScienceJourney
        onEnterConsole={() => {
          router.push('/login')
        }}
        onSeeHow={() => {
          // Through Lenis so the glide matches the wheel — the browser's
          // own smooth scroll would run a second, different animation.
          smoothScrollTo('#how-it-works', { duration: 1.6 })
        }}
      />

      <LandingFooter />
    </div>
  )
}

/* ================================================================== */
/* FOOTER                                                              */
/* ================================================================== */

function LandingFooter() {
  // The journey's own paper grid stops at its container's end on
  // purpose (see the fade in ScienceJourney), but the footer picks up
  // the same faint ruling so the page never hard-cuts from "journey"
  // to "plain site" — one continuous environment, no live shards
  // needed down here, just the paper it was always drawn on.
  const [grid, setGrid] = useState<string | null>(null)

  useEffect(() => {
    const read = () => setGrid(readJourneyTheme().gridFaint)
    read()
    return watchJourneyTheme(read)
  }, [])

  const paper: CSSProperties = grid
    ? {
        backgroundImage: `
          linear-gradient(${grid} 1px, transparent 1px),
          linear-gradient(90deg, ${grid} 1px, transparent 1px)
        `,
        backgroundSize: '225px 225px',
      }
    : {}

  return (
    <footer
      className="relative mt-auto border-t border-border/40 bg-background"
      style={paper}
    >
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-6 py-8 sm:flex-row sm:items-center sm:py-6">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-secondary font-mono text-sm font-black tracking-widest">
              DiagramMind
            </span>
            <span className="text-border">·</span>
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              v1.0
            </span>
          </div>
          <span className="max-w-md text-xs text-muted-foreground">
            Agentic, Retrieval-Augmented, Diagram-Driven Course Question
            Generation.
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          {AGENT_LEGEND.map((a) => (
            <span
              key={a.name}
              className="flex items-center gap-1.5 text-muted-foreground"
            >
              <span className={`size-1.5 rounded-full ${a.color}`} />
              {a.name}
            </span>
          ))}
        </div>
      </div>
    </footer>
  )
}
