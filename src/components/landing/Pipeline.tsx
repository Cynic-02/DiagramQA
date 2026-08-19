'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { SectionHead, HandArrow } from './primitives'

/* ==================================================================
   03 — THE PIPELINE.

   All six agents on ONE screen and ONE row — the handoff is a single
   left-to-right run, and breaking it over two lines broke that reading.
   The cards are kept close to square instead by widening the container,
   using compact connectors, and keeping each blurb to one short line of
   thought rather than a paragraph.

   The step is scroll-linked, so it is a pure function of scroll
   position: scrubbing is exact and reverse scrolling replays it.
   ================================================================== */

const AGENTS = [
  { n: '01', name: 'Extraction',   role: 'Vision',       out: 'nodes 14 · edges 11',        blurb: 'Reads the image as structure, not pixels.' },
  { n: '02', name: 'Generation',   role: 'Authoring',    out: 'drafted 12 · L1–L6',         blurb: "Writes candidates across Bloom's six levels." },
  { n: '03', name: 'Answering',    role: 'Independent',  out: 'answered 12/12',             blurb: 'A second agent answers each item cold.' },
  { n: '04', name: 'Verification', role: 'Adjudication', out: 'agreement 11/12',            blurb: 'Disagreement returns the item, never ships it.' },
  { n: '05', name: 'Quality',      role: 'Assurance',    out: 'ambiguity 0 · dupes 0',      blurb: 'Screens ambiguity, duplication, unsupported items.' },
  { n: '06', name: 'Export',       role: 'Delivery',     out: 'docx · csv · qti',           blurb: 'Hands you a set your gradebook understands.' },
] as const

function AgentCard({ a, i, step }: { a: (typeof AGENTS)[number]; i: number; step: number }) {
  const live = i === step
  const reached = i <= step
  return (
    <li
      className={cn(
        'flex min-h-[204px] min-w-0 flex-1 flex-col border-[3px] border-[var(--line)] bg-[var(--card)]',
        'transition-[transform,box-shadow] duration-[90ms] ease-[cubic-bezier(.2,0,0,1)]',
        live
          ? 'translate-x-[-2px] translate-y-[-2px] shadow-[7px_7px_0_var(--line)]'
          : 'shadow-[3px_3px_0_var(--line)]'
      )}
    >
      <div
        className={cn('flex items-center justify-between gap-1.5 px-2.5 py-2', `bloom-${i + 1}`)}
        style={{ opacity: reached ? 1 : 0.38 }}
      >
        <span className="lbl">{a.n}</span>
        <span className="lbl text-[9px]">{a.role}</span>
      </div>

      <div className="flex flex-1 flex-col p-3.5">
        <h3
          className="font-[family-name:var(--font-archivo)] font-bold leading-none tracking-[-0.02em]"
          style={{ fontSize: 'clamp(1rem, 1.15vw, 1.3rem)' }}
        >
          {a.name}
        </h3>
        <p className="mt-2 text-[13px] leading-snug text-[var(--ink-2)]">{a.blurb}</p>

        <div className="mt-auto border-t-2 border-[var(--line)] pt-2.5">
          {reached ? (
            <p className="dat text-[10px] leading-snug">
              <span className="text-[var(--red)]">›</span> {a.out}
              {live && <span className="thinking-caret ml-1 align-middle" />}
            </p>
          ) : (
            <p className="dat text-[10px] leading-snug text-[var(--ink-2)] opacity-50">
              › awaiting packet
            </p>
          )}
        </div>
      </div>
    </li>
  )
}

export function Pipeline() {
  const wrapRef = React.useRef<HTMLDivElement | null>(null)
  const [step, setStep] = React.useState(0)

  React.useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    let raf = 0
    let queued = false

    const read = () => {
      queued = false
      const r = el.getBoundingClientRect()
      const total = r.height - window.innerHeight
      if (total <= 0) return
      const p = Math.min(Math.max(-r.top / total, 0), 1)
      setStep(Math.min(5, Math.floor(p * 6.6)))
    }

    const onScroll = () => {
      if (queued) return
      queued = true
      raf = requestAnimationFrame(read)
    }

    read()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return (
    <section id="pipeline" data-section="03 — THE PIPELINE" className="relative z-10 rule-t">
      <div ref={wrapRef} className="relative h-[240vh]">
        <div className="sticky top-0 flex min-h-screen flex-col justify-center px-5 sm:px-8 lg:px-10">
          <div className="mx-auto w-full max-w-[1560px] py-10">
            <SectionHead n="03" title="THE PIPELINE" tag="six agents · one screen">
              Six specialised agents, each doing one job and handing off. The packet moving
              through them is the diagram you uploaded.
            </SectionHead>

            {/* The spectrum sweep is the only progress bar in the system. */}
            <div className="spectrum mb-7 h-4" aria-hidden>
              {[1, 2, 3, 4, 5, 6].map((n, i) => (
                <span
                  key={n}
                  className={`bloom-${n}`}
                  style={{
                    opacity: i <= step ? 1 : 0.12,
                    transition: 'opacity 90ms cubic-bezier(.2,0,0,1)',
                  }}
                />
              ))}
            </div>

            {/* One row. The handoff is a single left-to-right run. */}
            <ol className="flex flex-col items-stretch gap-4 xl:flex-row xl:gap-0">
              {AGENTS.map((a, i) => (
                <React.Fragment key={a.n}>
                  <AgentCard a={a} i={i} step={step} />
                  {i < AGENTS.length - 1 && (
                    <li
                      aria-hidden
                      className="flex flex-none items-center justify-center"
                      style={{ opacity: i < step ? 1 : 0.28, transition: 'opacity 90ms' }}
                    >
                      <HandArrow dir="right" className="hidden h-5 w-9 xl:block" />
                      <HandArrow dir="down" className="block h-9 w-5 xl:hidden" />
                    </li>
                  )}
                </React.Fragment>
              ))}
            </ol>

            <p className="dat mt-6 text-xs text-[var(--ink-2)]">
              AGENT {String(Math.min(step + 1, 6)).padStart(2, '0')} / 06 —{' '}
              {AGENTS[Math.min(step, 5)].name.toUpperCase()}
              {step >= 5 ? ' · ✓ COMPLETE' : ''}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
