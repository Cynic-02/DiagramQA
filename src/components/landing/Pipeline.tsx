'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { SectionHead, HandArrow } from './primitives'

/* ==================================================================
   03 — THE PIPELINE.

   All six agents on ONE screen, not six. The old site spent fifteen
   full viewports narrating this and never actually explained it.

   Laid out three across, two down, and read as a snake: 01→02→03,
   drop, 04→05→06. Six boxes in a single row forced each one into a
   tall narrow column of ragged text; three across gives each agent a
   card wider than it is tall, which is what makes a row of them
   scannable.

   The step is scroll-linked, so it is a pure function of scroll
   position: scrubbing is exact and reverse scrolling replays it.
   ================================================================== */

const AGENTS = [
  {
    n: '01',
    name: 'Extraction',
    role: 'Vision',
    out: 'nodes 14 · edges 11 · labels 5',
    blurb: 'Reads the image as structure, not as pixels — every node, edge and label.',
  },
  {
    n: '02',
    name: 'Generation',
    role: 'Authoring',
    out: 'drafted 12 items across L1–L6',
    blurb: "Writes candidates conditioned on Bloom's taxonomy, not one flat difficulty.",
  },
  {
    n: '03',
    name: 'Answering',
    role: 'Independent',
    out: 'answered 12/12 · no question context',
    blurb: 'A separate agent answers each item cold, without seeing the intended answer.',
  },
  {
    n: '04',
    name: 'Verification',
    role: 'Adjudication',
    out: 'agreement 11/12 · 1 returned',
    blurb: 'Compares the two answers. Disagreement returns the item instead of shipping it.',
  },
  {
    n: '05',
    name: 'Quality',
    role: 'Assurance',
    out: 'ambiguity 0 · duplicates 0',
    blurb: 'Screens for ambiguity, duplication, and items the diagram cannot support.',
  },
  {
    n: '06',
    name: 'Export',
    role: 'Delivery',
    out: 'docx · csv · qti · print',
    blurb: 'Hands you a question set in a format your gradebook already understands.',
  },
] as const

function AgentCard({ a, i, step }: { a: (typeof AGENTS)[number]; i: number; step: number }) {
  const live = i === step
  const reached = i <= step
  return (
    <li
      className={cn(
        'flex min-h-[212px] min-w-0 flex-col border-[3px] border-[var(--ink)] bg-[var(--card)]',
        'transition-[transform,box-shadow] duration-[90ms] ease-[cubic-bezier(.2,0,0,1)]',
        live
          ? 'translate-x-[-2px] translate-y-[-2px] shadow-[7px_7px_0_var(--ink)]'
          : 'shadow-[3px_3px_0_var(--ink)]'
      )}
    >
      <div
        className={cn('flex items-center justify-between gap-2 px-3 py-2', `bloom-${i + 1}`)}
        style={{ opacity: reached ? 1 : 0.38 }}
      >
        <span className="lbl">{a.n}</span>
        <span className="lbl">{a.role}</span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="d-s">{a.name}</h3>
        <p className="mt-2 text-sm leading-relaxed text-[var(--ink-2)]">{a.blurb}</p>

        <div className="mt-auto border-t-2 border-[var(--ink)] pt-3">
          {reached ? (
            <p className="dat text-[11px] leading-relaxed">
              <span className="text-[var(--red)]">›</span> {a.out}
              {live && <span className="thinking-caret ml-1 align-middle" />}
            </p>
          ) : (
            <p className="dat text-[11px] leading-relaxed text-[var(--ink-2)] opacity-50">
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

  const rows = [
    [0, 1, 2],
    [3, 4, 5],
  ]

  return (
    <section id="pipeline" data-section="03 — THE PIPELINE" className="relative z-10 rule-t">
      <div ref={wrapRef} className="relative h-[240vh]">
        <div className="sticky top-0 flex min-h-screen flex-col justify-center px-6 sm:px-10 lg:px-16">
          <div className="mx-auto w-full max-w-[1180px] py-10">
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

            {rows.map((row, r) => (
              <React.Fragment key={r}>
                <ol className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-0">
                  {row.map((idx, c) => (
                    <React.Fragment key={idx}>
                      <AgentCard a={AGENTS[idx]} i={idx} step={step} />
                      {c < row.length - 1 && (
                        <li
                          aria-hidden
                          className="flex flex-none items-center justify-center"
                          style={{ opacity: idx < step ? 1 : 0.28, transition: 'opacity 90ms' }}
                        >
                          <HandArrow dir="right" className="hidden lg:block" />
                          <HandArrow dir="down" className="block lg:hidden" />
                        </li>
                      )}
                    </React.Fragment>
                  ))}
                </ol>

                {/* the wrap: 03 hands off to 04 on the next line */}
                {r === 0 && (
                  <div
                    aria-hidden
                    className="flex justify-center py-1 lg:py-2"
                    style={{ opacity: step > 2 ? 1 : 0.28, transition: 'opacity 90ms' }}
                  >
                    <HandArrow dir="down" />
                  </div>
                )}
              </React.Fragment>
            ))}

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
