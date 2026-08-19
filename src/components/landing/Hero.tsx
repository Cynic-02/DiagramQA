'use client'

import { Spectrum, Btn } from './primitives'

/* ==================================================================
   01 — HERO. State the thesis.

   Two columns on desktop: the claim on the left, the graph's half of
   the viewport on the right. The first pass ran the headline at
   clamp(...,9rem) across four lines, which at leading 0.85 is taller
   than the viewport on its own — the copy ran off the bottom of the
   screen and collided with the graph. Display type still carries, but
   it has to fit on one screen to do its job.
   ================================================================== */
export function Hero({
  onStart,
  onProof,
}: {
  onStart: () => void
  onProof: () => void
}) {
  return (
    <section
      id="hero"
      data-section="01 — THE THESIS"
      className="relative z-10 flex min-h-[calc(100svh-44px)] items-center px-6 py-12 sm:px-10 lg:px-16"
    >
      <div className="mx-auto grid w-full max-w-[1400px] items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
        <div className="min-w-0">
          <Spectrum className="mb-7 h-8 max-w-[380px]" />

          <p className="lbl mb-5 text-[var(--red)]">
            Six agents · one pipeline · verified output
          </p>

          <h1
            className="text-balance"
            style={{
              fontFamily: 'var(--font-archivo), "Arial Black", sans-serif',
              fontWeight: 900,
              fontSize: 'clamp(2.5rem, 5.6vw, 5.2rem)',
              letterSpacing: '-0.04em',
              lineHeight: 0.86,
            }}
          >
            TURN ANY DIAGRAM
            <br />
            INTO A <span className="text-[var(--red)]">VERIFIED</span>
            <br />
            QUESTION SET.
          </h1>

          {/* An opaque block, so copy is always a layer in FRONT of the
              graph rather than floating on top of it. */}
          <div className="mt-8 max-w-[54ch] border-[3px] border-[var(--ink)] bg-[var(--card)] p-5 shadow-[6px_6px_0_var(--ink)]">
            <p className="leading-relaxed">
              Upload a diagram of the nitrogen cycle. Get twelve questions across all six
              Bloom levels — each one independently answered and{' '}
              <span className="marker-highlight">verified by a second agent</span> before
              you ever see it.
            </p>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-4">
            <Btn variant="primary" onClick={onStart}>
              Start free →
            </Btn>
            <Btn variant="default" onClick={onProof}>
              See a real output ↓
            </Btn>
            {/* Marginalia. Maximum one per viewport. */}
            <span className="marginalia">no card needed</span>
          </div>
        </div>

        {/* The graph occupies this column on desktop. It is painted by
            the fixed canvas behind the page, so this is just the space
            reserved for it. */}
        <div className="hidden lg:block" aria-hidden />
      </div>
    </section>
  )
}
