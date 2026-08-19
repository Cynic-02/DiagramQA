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
import { RevealOnScroll } from '@/components/reveal'
import {
  readJourneyTheme,
  watchJourneyTheme,
  type JourneyTheme,
} from '@/lib/journey/theme'
import JourneyStage from './JourneyStage'
import Shuffle from '@/components/reactbits/Shuffle'

/** Same fixed accent cycle the rest of the page uses for kicker chips —
 *  rotates per agent so the six formations read as distinct steps. */
const CARD_ACCENTS = ['bg-primary', 'bg-secondary', 'bg-accent'] as const

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

  // Graph ruling only — no background fill. Painting an opaque sheet
  // here made the journey read as a separate website from the sections
  // below it; letting the page's own background run through keeps one
  // continuous surface, with the grid as a texture on top of it.
  const paper: React.CSSProperties = theme
    ? {
        backgroundColor: 'transparent',
        backgroundImage: `
          linear-gradient(${theme.grid} 1px, transparent 1px),
          linear-gradient(90deg, ${theme.grid} 1px, transparent 1px),
          linear-gradient(${theme.gridFaint} 1px, transparent 1px),
          linear-gradient(90deg, ${theme.gridFaint} 1px, transparent 1px)
        `,
        backgroundSize: '225px 225px, 225px 225px, 45px 45px, 45px 45px',
      }
    : { backgroundColor: 'transparent' }

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
            <div className="relative w-full max-w-[540px] pb-24 pt-28 sm:pb-32 lg:max-w-[46%] lg:py-0">
              {/* soft depth scrim — recedes the particle field directly
                  behind the headline so the copy reads as a layer in
                  FRONT of the shards, instead of flat on top of them */}
              <div
                aria-hidden
                className="pointer-events-none absolute -inset-x-10 -inset-y-16 z-0 backdrop-blur-2xl sm:-inset-x-20 sm:-inset-y-24"
                style={{
                  background: 'color-mix(in srgb, var(--background) 42%, transparent)',
                  WebkitMaskImage:
                    'radial-gradient(ellipse 60% 65% at 38% 42%, black 0%, black 35%, transparent 75%)',
                  maskImage:
                    'radial-gradient(ellipse 60% 65% at 38% 42%, black 0%, black 35%, transparent 75%)',
                }}
              />

              <div className="relative z-10">
              <span className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-primary drop-shadow-sm">
                <span className="inline-block size-1.5 rounded-full bg-primary" />
                <Shuffle
                  text="AI-Powered Visual Learning"
                  tag="span"
                  className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-primary"
                  textAlign="left"
                  shuffleDirection="right"
                  duration={0.3}
                  shuffleTimes={1}
                  animationMode="evenodd"
                  stagger={0.025}
                  threshold={0.1}
                  triggerOnce={true}
                  triggerOnHover={true}
                  respectReducedMotion={true}
                />
              </span>

              <h1 className="mt-6 text-balance text-4xl font-black leading-[1.02] tracking-tight text-foreground drop-shadow-md sm:text-5xl lg:text-6xl">
                <Shuffle
                  text="Turn Diagrams Into"
                  tag="span"
                  className="text-foreground"
                  textAlign="left"
                  shuffleDirection="right"
                  duration={0.4}
                  shuffleTimes={1}
                  animationMode="evenodd"
                  stagger={0.02}
                  threshold={0.1}
                  triggerOnce={true}
                  triggerOnHover={true}
                  respectReducedMotion={true}
                />{' '}
                <Shuffle
                  text="Questions"
                  tag="span"
                  className="text-primary"
                  textAlign="left"
                  shuffleDirection="right"
                  duration={0.4}
                  shuffleTimes={1}
                  animationMode="evenodd"
                  stagger={0.02}
                  threshold={0.1}
                  triggerOnce={true}
                  triggerOnHover={true}
                  respectReducedMotion={true}
                />
              </h1>

              <p className="mt-6 max-w-lg text-pretty text-base leading-relaxed text-muted-foreground drop-shadow-sm sm:text-lg">
                Generate meaningful questions directly from scientific diagrams
                using intelligent visual understanding.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onEnterConsole}
                  className="group inline-flex h-12 items-center gap-2 rounded-full bg-foreground px-7 text-sm font-bold text-background shadow-lg shadow-black/20 transition-transform duration-200 hover:-translate-y-0.5"
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

              {/* The hero doubles as the first agent, so all six are
                  represented across the six formations. */}
              <div className="brutal-block mt-12 max-w-sm p-5 sm:p-6">
                <span className={`brutal-block-sm inline-flex items-center gap-2 ${CARD_ACCENTS[0]} px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-foreground`}>
                  <span className="size-1.5 rounded-full bg-foreground" />
                  Agent 01
                </span>
                <Shuffle
                  text={scene.title}
                  tag="h3"
                  className="mt-4 text-xl font-bold leading-tight tracking-tight text-foreground sm:text-2xl"
                  textAlign="left"
                  shuffleDirection="right"
                  duration={0.35}
                  shuffleTimes={1}
                  animationMode="evenodd"
                  stagger={0.02}
                  threshold={0.2}
                  triggerOnce={true}
                  triggerOnHover={true}
                  respectReducedMotion={true}
                />
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {scene.caption}
                </p>
              </div>

              <span className="mt-10 hidden items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground/70 lg:inline-flex">
                <ArrowDown className="size-3 animate-bounce" />
                Scroll — one pipeline, start to finish
              </span>
              </div>
            </div>
          </section>
        ) : (
          <section
            key={scene.id}
            id={scene.anchorId}
            style={sectionStyle}
            aria-label={scene.title}
            className={`relative z-30 flex items-end px-6 pb-16 sm:px-10 lg:items-center lg:px-16 lg:pb-0 ${
              // sit opposite the formation, so the copy is never buried
              // under the shards
              (scene.x ?? 0) < 0 ? 'lg:justify-end' : 'lg:justify-start'
            }`}
          >
            <RevealOnScroll direction="up" amount={0.5} className="max-w-[460px]">
              <div className="brutal-block p-6 sm:p-7">
                <span className={`brutal-block-sm inline-flex items-center gap-2 ${CARD_ACCENTS[i % CARD_ACCENTS.length]} px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-foreground`}>
                  <span className="size-1.5 rounded-full bg-foreground" />
                  {scene.badgeLabel ?? 'Agent'} {scene.badgeNum ?? String(i + 1).padStart(2, '0')}
                </span>
                <Shuffle
                  text={scene.title}
                  tag="h3"
                  className="mt-4 text-balance text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl"
                  textAlign="left"
                  shuffleDirection="right"
                  duration={0.35}
                  shuffleTimes={1}
                  animationMode="evenodd"
                  stagger={0.02}
                  threshold={0.3}
                  triggerOnce={true}
                  triggerOnHover={true}
                  respectReducedMotion={true}
                />
                <p className="mt-3 text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
                  {scene.caption}
                </p>
                {scene.bullets && (
                  <ul className="mt-4 flex flex-col gap-2">
                    {scene.bullets.map((b) => (
                      <li
                        key={b}
                        className="flex items-start gap-2 text-sm leading-relaxed text-foreground/75"
                      >
                        <span
                          aria-hidden
                          className={`mt-1.5 size-1.5 flex-shrink-0 rounded-full ${CARD_ACCENTS[i % CARD_ACCENTS.length]}`}
                        />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </RevealOnScroll>
          </section>
        )
      )}

      {/* Trailing runway. The final scene assembles half a viewport from
          the container's end, so without this the next section scrolls up
          underneath it while it is still pinned — this height is exactly
          what JourneyStage's fade math (fadeEnd = containerEnd -
          0.5*sectionH) needs to finish the dissolve right as the next
          section arrives, so it stays untouched.
          The closing CTA is absolutely positioned to its bottom edge
          instead of added as normal-flow content, so it visually sits at
          the end of the runway without changing this element's height —
          nothing here can throw off the fade timing above. */}
      <div
        style={{ height: `${JOURNEY_CONFIG.outroVh}vh` }}
        className="relative z-30 w-full"
      >
        {/* Centred in the runway rather than glued to its bottom edge —
            bottom-anchoring left a huge dead gap above the CTA once the
            preceding section's card (which itself sits at its section's
            bottom edge) scrolled past. Centring halves that gap without
            touching outroVh, which the fade math above depends on. */}
        <div className="absolute inset-0 flex w-full items-center justify-center px-6 sm:px-10">
          <RevealOnScroll direction="up" amount={0.4} className="w-full max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
              <span className="inline-block size-1.5 rounded-full bg-primary" />
              Ready when you are
            </span>
            <h2 className="mt-4 text-balance text-3xl font-black leading-tight tracking-tight text-foreground sm:text-4xl">
              Turn your next diagram into a question set.
            </h2>
            <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              Six agents, one pipeline, verified output — start with any
              diagram you already have.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={onEnterConsole}
                className="group inline-flex h-12 items-center gap-2 rounded-full bg-foreground px-7 text-sm font-bold text-background shadow-lg shadow-black/20 transition-transform duration-200 hover:-translate-y-0.5"
              >
                Try It Now
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
              </button>
            </div>
          </RevealOnScroll>
        </div>
      </div>

      {/* the grid fades out rather than ending on a hard rule */}
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
