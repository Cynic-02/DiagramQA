'use client'

/**
 * ScienceJourney — the scroll spine of the landing page.
 *
 * One full-viewport section per illustration. The illustration for a
 * section is fully assembled when that section's vertical centre meets
 * the viewport centre; between two centres the shared particle cloud
 * carries the ink from one diagram to the next.
 *
 * This component owns only layout + copy. All the animation lives in
 * <JourneyStage />, and the sequence itself lives in
 * src/config/journey-scenes.ts.
 *
 * Every colour here comes from the site's theme tokens, so the mode
 * toggle and the palette switcher both drive this section — it is not a
 * hardcoded cream island in the middle of a themed site.
 */

import { useEffect, useRef, useState } from 'react'
import { ArrowRight, ArrowDown } from 'lucide-react'

import { JOURNEY_CONFIG, JOURNEY_SCENES } from '@/config/journey-scenes'
import {
  readJourneyTheme,
  watchJourneyTheme,
  type JourneyTheme,
} from '@/lib/journey/theme'
import JourneyStage from './JourneyStage'

export default function ScienceJourney({
  onEnterConsole,
  onSeeHow,
}: {
  onEnterConsole?: () => void
  onSeeHow?: () => void
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const scenes = JOURNEY_SCENES
  const sectionStyle = { minHeight: `${JOURNEY_CONFIG.sectionVh}vh` }

  const [theme, setTheme] = useState<JourneyTheme | null>(null)

  useEffect(() => {
    const read = () => setTheme(readJourneyTheme())
    read()
    return watchJourneyTheme(read)
  }, [])

  // Graph paper built from live tokens: page background + two grid
  // densities drawn in the foreground colour at low alpha.
  const paper: React.CSSProperties = theme
    ? {
        backgroundColor: theme.paper,
        backgroundImage: `
          linear-gradient(${theme.grid} 1px, transparent 1px),
          linear-gradient(90deg, ${theme.grid} 1px, transparent 1px),
          linear-gradient(${theme.gridFaint} 1px, transparent 1px),
          linear-gradient(90deg, ${theme.gridFaint} 1px, transparent 1px)
        `,
        backgroundSize: '225px 225px, 225px 225px, 45px 45px, 45px 45px',
      }
    : { backgroundColor: 'var(--background)' }

  return (
    <div ref={containerRef} className="relative w-full">
      {/* ---- layer 1: pinned graph paper ---- */}
      <div
        className="pointer-events-none absolute inset-0 z-0 overflow-clip"
        aria-hidden
      >
        <div className="sticky top-0 h-screen w-full" style={paper} />
      </div>

      {/* layer 2 (the particle canvas + crisp artwork) is portalled by
          JourneyStage so no ancestor transform can shift it */}

      {/* ---- layer 3: ordinary, selectable, accessible page content ---- */}
      {scenes.map((scene, i) =>
        i === 0 ? (
          <section
            key={scene.id}
            id="hero"
            style={sectionStyle}
            className="relative z-30 flex items-center px-6 sm:px-10 lg:px-16"
          >
            <div className="w-full max-w-[540px] pb-24 pt-28 sm:pb-32 lg:max-w-[46%] lg:py-0">
              <span className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
                <span className="inline-block size-1.5 rounded-full bg-primary" />
                AI-Powered Visual Learning
              </span>

              <h1 className="mt-6 text-balance text-4xl font-black leading-[1.02] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Turn Diagrams Into <span className="text-primary">Questions</span>
              </h1>

              <p className="mt-6 max-w-lg text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
                Generate meaningful questions directly from scientific diagrams
                using intelligent visual understanding.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onEnterConsole}
                  className="group inline-flex h-12 items-center gap-2 rounded-full bg-foreground px-7 text-sm font-bold text-background transition-transform duration-200 hover:-translate-y-0.5"
                >
                  Try It Now
                  <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
                </button>
                <button
                  type="button"
                  onClick={onSeeHow}
                  className="inline-flex h-12 items-center gap-2 rounded-full border border-foreground/25 px-7 text-sm font-bold text-foreground transition-colors duration-200 hover:bg-foreground/5"
                >
                  See How It Works
                </button>
              </div>

              <span className="mt-14 hidden items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground/70 lg:inline-flex">
                <ArrowDown className="size-3 animate-bounce" />
                Scroll — the ink rearranges itself
              </span>
            </div>
          </section>
        ) : (
          <section
            key={scene.id}
            style={sectionStyle}
            aria-label={scene.title}
            className="relative z-30 flex items-end px-6 pb-16 sm:px-10 lg:items-center lg:px-16 lg:pb-0"
          >
            <div className="max-w-[420px]">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">
                {String(i + 1).padStart(2, '0')} — {scene.title}
              </span>
              <p className="mt-3 text-pretty text-xl font-semibold leading-snug text-foreground sm:text-2xl">
                {scene.caption}
              </p>
            </div>
          </section>
        )
      )}

      {/* The graph paper stops dead at the container edge, which leaves a
          hard horizontal seam where the grid ends. Fade the grid out over
          the tail of the last section instead. Sits at z-10: above the
          paper, below both the artwork (z-20) and the copy (z-30). */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[55vh]"
        style={{
          background: `linear-gradient(to bottom, transparent, ${
            theme?.paper ?? 'var(--background)'
          } 78%)`,
        }}
      />

      <JourneyStage scenes={scenes} containerRef={containerRef} />
    </div>
  )
}
