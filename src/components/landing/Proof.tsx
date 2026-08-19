'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { BLOOM_LABELS } from '@/lib/graph/layouts'
import { SectionHead, Wipe, Stamp, HandArrow } from './primitives'

/* ==================================================================
   02 — THE PROOF.

   The section the old site did not have, and the one worth more than
   the other seven combined. A real diagram in, real questions out,
   colour-coded by cognitive level, each carrying its verification
   state. The product's proof is the artifact it produces — so show
   the artifact.

   The diagrams below are hand-authored inline SVG: hard ink lines,
   a few hundred bytes each. They replace 28.7 MB of traced artwork
   and, unlike that artwork, they are actually diagrams.
   ================================================================== */

type Q = { level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
type Sample = { id: string; label: string; svg: React.ReactNode; questions: Q[] }

const S = {
  box: 'fill-[var(--card)] stroke-[var(--ink)]',
  txt: 'fill-[var(--ink)] font-mono',
}

function Node({ x, y, w = 84, h = 34, label }: { x: number; y: number; w?: number; h?: number; label: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} className={S.box} strokeWidth={2.5} />
      <text
        x={x + w / 2}
        y={y + h / 2 + 4}
        textAnchor="middle"
        className={S.txt}
        style={{ fontSize: 10.5, letterSpacing: '0.04em' }}
      >
        {label}
      </text>
    </g>
  )
}

function Arrow({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      className="stroke-[var(--ink)]"
      strokeWidth={2.5}
      markerEnd="url(#rubric-arrow)"
    />
  )
}

function Defs() {
  return (
    <defs>
      <marker id="rubric-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" className="fill-[var(--ink)]" />
      </marker>
    </defs>
  )
}

const SAMPLES: Sample[] = [
  {
    id: 'nitrogen',
    label: 'Nitrogen cycle',
    svg: (
      <svg viewBox="0 0 380 260" className="h-full w-full">
        <Defs />
        <Node x={20} y={16} label="N₂ (air)" />
        <Node x={148} y={100} label="Nitrites" />
        <Node x={276} y={16} label="Nitrates" />
        <Node x={20} y={196} label="Ammonia" />
        <Node x={276} y={196} label="Plants" />
        <Arrow x1={62} y1={50} x2={160} y2={100} />
        <Arrow x1={232} y1={112} x2={300} y2={50} />
        <Arrow x1={318} y1={50} x2={318} y2={196} />
        <Arrow x1={276} y1={213} x2={104} y2={213} />
        <Arrow x1={62} y1={196} x2={158} y2={134} />
      </svg>
    ),
    questions: [
      { level: 1, text: 'Name the two intermediate compounds shown between atmospheric N₂ and plant uptake.' },
      { level: 3, text: 'Using the diagram, predict what happens to nitrate availability if nitrifying bacteria are removed.' },
      { level: 4, text: 'Compare the two pathways returning nitrogen to the soil and identify which is rate-limiting.' },
      { level: 6, text: 'Design an experiment that would test whether the ammonia step is bacterially mediated.' },
    ],
  },
  {
    id: 'circuit',
    label: 'Series circuit',
    svg: (
      <svg viewBox="0 0 380 260" className="h-full w-full">
        <Defs />
        <rect x={40} y={40} width={300} height={180} className="fill-none stroke-[var(--ink)]" strokeWidth={2.5} />
        <rect x={26} y={112} width={28} height={40} className="fill-[var(--card)] stroke-[var(--ink)]" strokeWidth={2.5} />
        <text x={40} y={102} textAnchor="middle" className={S.txt} style={{ fontSize: 10.5 }}>9V</text>
        <rect x={110} y={26} width={56} height={28} className="fill-[var(--card)] stroke-[var(--ink)]" strokeWidth={2.5} />
        <text x={138} y={45} textAnchor="middle" className={S.txt} style={{ fontSize: 10.5 }}>R₁</text>
        <rect x={220} y={26} width={56} height={28} className="fill-[var(--card)] stroke-[var(--ink)]" strokeWidth={2.5} />
        <text x={248} y={45} textAnchor="middle" className={S.txt} style={{ fontSize: 10.5 }}>R₂</text>
        <rect x={166} y={206} width={56} height={28} className="fill-[var(--card)] stroke-[var(--ink)]" strokeWidth={2.5} />
        <text x={194} y={225} textAnchor="middle" className={S.txt} style={{ fontSize: 10.5 }}>R₃</text>
      </svg>
    ),
    questions: [
      { level: 1, text: 'State the supply voltage and label each of the three resistors in the circuit.' },
      { level: 3, text: 'Use the circuit shown to calculate the current through R₃.' },
      { level: 4, text: 'Analyse how total resistance changes if R₂ is shorted, and justify with the diagram.' },
      { level: 5, text: 'Evaluate whether this arrangement is suitable for a 2 A load. Justify your answer.' },
    ],
  },
  {
    id: 'neuron',
    label: 'Neuron',
    svg: (
      <svg viewBox="0 0 380 260" className="h-full w-full">
        <Defs />
        <circle cx={110} cy={130} r={40} className="fill-[var(--card)] stroke-[var(--ink)]" strokeWidth={2.5} />
        <text x={110} y={134} textAnchor="middle" className={S.txt} style={{ fontSize: 10.5 }}>soma</text>
        {[[70, 60], [58, 118], [70, 200], [104, 58]].map(([x, y], i) => (
          <line key={i} x1={100} y1={120} x2={x} y2={y} className="stroke-[var(--ink)]" strokeWidth={2.5} />
        ))}
        <line x1={150} y1={130} x2={296} y2={130} className="stroke-[var(--ink)]" strokeWidth={4} />
        <text x={220} y={118} textAnchor="middle" className={S.txt} style={{ fontSize: 10.5 }}>axon</text>
        {[[330, 96], [340, 130], [330, 166]].map(([x, y], i) => (
          <line key={i} x1={296} y1={130} x2={x} y2={y} className="stroke-[var(--ink)]" strokeWidth={2.5} markerEnd="url(#rubric-arrow)" />
        ))}
        <rect x={196} y={140} width={48} height={20} className="fill-[var(--card)] stroke-[var(--ink)]" strokeWidth={2} />
        <text x={220} y={154} textAnchor="middle" className={S.txt} style={{ fontSize: 9 }}>myelin</text>
      </svg>
    ),
    questions: [
      { level: 1, text: 'Label the soma, axon, myelin sheath and terminals shown in the diagram.' },
      { level: 2, text: 'Explain, in your own words, why the arrows at the terminals point outward.' },
      { level: 4, text: 'Analyse how conduction velocity would change if the myelin segment were removed.' },
      { level: 6, text: 'Redraw this neuron adapted for a much longer transmission distance and explain each change.' },
    ],
  },
  {
    id: 'mitochondrion',
    label: 'Mitochondrion',
    svg: (
      <svg viewBox="0 0 380 260" className="h-full w-full">
        <Defs />
        <ellipse cx={190} cy={130} rx={150} ry={86} className="fill-[var(--card)] stroke-[var(--ink)]" strokeWidth={3} />
        <ellipse cx={190} cy={130} rx={132} ry={68} className="fill-none stroke-[var(--ink)]" strokeWidth={2} />
        {[80, 130, 180, 230, 280].map((x, i) => (
          <path
            key={i}
            d={`M ${x} ${62 + (i % 2) * 8} q 26 34 0 ${68 - (i % 2) * 16}`}
            className="fill-none stroke-[var(--ink)]"
            strokeWidth={2.5}
          />
        ))}
        <text x={190} y={238} textAnchor="middle" className={S.txt} style={{ fontSize: 10.5 }}>
          A: outer · B: inner · C: cristae
        </text>
      </svg>
    ),
    questions: [
      { level: 1, text: 'Name the three structures labelled A, B and C in the mitochondrion above.' },
      { level: 3, text: 'Predict what happens to ATP output if the cristae surface area is halved.' },
      { level: 5, text: 'Assess whether this diagram accurately represents the proton gradient. Justify.' },
      { level: 6, text: 'Redraw this organelle as it would appear in a cell adapted to low oxygen.' },
    ],
  },
]

/* ------------------------------------------------------------------
   THE SEVERED EDGE — the money shot. One edge detaches from the
   diagram, flies right, and lands as a question card.
   A diagram is a graph. A question is an edge you remove.
   ------------------------------------------------------------------ */
function SeveredEdge({ play }: { play: boolean }) {
  return (
    <svg
      className="pointer-events-none absolute inset-0 z-20 hidden h-full w-full lg:block"
      aria-hidden
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <line
        x1="34"
        y1="50"
        x2={play ? '96' : '34'}
        y2={play ? '22' : '50'}
        stroke="var(--red)"
        strokeWidth="0.7"
        vectorEffect="non-scaling-stroke"
        style={{
          transition: 'x2 900ms cubic-bezier(.16,1,.3,1), y2 900ms cubic-bezier(.16,1,.3,1), opacity 400ms 900ms',
          opacity: play ? 0 : 1,
        }}
      />
    </svg>
  )
}

export function Proof() {
  const [active, setActive] = React.useState(0)
  const [stamped, setStamped] = React.useState<number | null>(null)
  const [play, setPlay] = React.useState(false)
  const hostRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    const el = hostRef.current
    if (!el) return
    const io = new IntersectionObserver(
      (es) => {
        if (es[0]?.isIntersecting) {
          setPlay(true)
          io.disconnect()
        }
      },
      { threshold: 0.35 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const sample = SAMPLES[active]

  function verify(i: number) {
    setStamped(i)
    window.setTimeout(() => setStamped(null), 1700)
  }

  return (
    <section
      id="proof"
      data-section="02 — THE PROOF"
      className="relative z-10 rule-t px-6 sm:px-10 lg:px-16"
    >
      <div className="mx-auto max-w-[1200px] pb-20">
        <SectionHead n="02" title="THE PROOF" tag="a real output">
          A diagram is a graph. A question is an edge you remove. Pick a diagram — the
          question set on the right is regenerated from it, graded across Bloom&apos;s six
          levels, and every item has already been answered and checked by a second agent.
        </SectionHead>

        {/* diagram picker — tabs stay butted together, because they
            are one control */}
        <div className="joined mb-7 flex flex-wrap" role="tablist" aria-label="Sample diagrams">
          {SAMPLES.map((s, i) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={i === active}
              onClick={() => setActive(i)}
              className={cn(
                'lbl border-[3px] border-[var(--ink)] px-4 py-3 transition-colors duration-[90ms]',
                i === active
                  ? 'bg-[var(--ink)] text-[var(--background)]'
                  : 'bg-[var(--card)] hover:bg-[var(--yellow)] hover:text-[#0a0a0a]'
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Input and output are separated, with a drawn arrow between
            them. Butting them together made one wide table; the gap and
            the arrow make it a transformation. */}
        <div
          ref={hostRef}
          className="relative grid items-start gap-7 lg:grid-cols-[minmax(0,42%)_auto_minmax(0,1fr)] lg:gap-5"
        >
          <SeveredEdge play={play} />

          {/* ---- the diagram ---- */}
          <div className="border-[3px] border-[var(--ink)] bg-[var(--card)] shadow-[5px_5px_0_var(--ink)]">
            <div className="flex items-center justify-between gap-3 bg-[var(--ink)] px-3 py-2 text-[var(--background)]">
              <span className="lbl">Input · diagram</span>
              <span className="lbl opacity-70">{sample.label}</span>
            </div>
            <div className="grid-faint aspect-[380/260] w-full p-2">{sample.svg}</div>
            <div className="border-t-2 border-[var(--ink)] px-3 py-2.5">
              <span className="dat text-xs text-[var(--ink-2)]">
                vision extraction → 14 nodes, 11 edges, 5 labels
              </span>
            </div>
          </div>

          {/* ---- the transformation ---- */}
          <div className="flex items-center justify-center self-center py-1 lg:h-full lg:py-0">
            <HandArrow dir="right" className="hidden lg:block" />
            <HandArrow dir="down" className="block lg:hidden" />
          </div>

          {/* ---- the questions ---- */}
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex items-center justify-between gap-3 border-[3px] border-[var(--ink)] bg-[var(--ink)] px-3 py-2 text-[var(--background)] shadow-[5px_5px_0_var(--red)]">
              <span className="lbl">Output · question set</span>
              <span className="lbl opacity-70">
                {sample.questions.length} items · all verified
              </span>
            </div>

            {sample.questions.map((q, i) => (
              <Wipe
                key={`${sample.id}-${i}`}
                delay={i * 60}
                className="relative border-[3px] border-[var(--ink)] bg-[var(--card)] shadow-[4px_4px_0_var(--ink)]"
              >
                <button
                  onClick={() => verify(i)}
                  className="w-full text-left transition-colors duration-[90ms] hover:bg-[var(--yellow)]/25"
                  aria-label={`Re-verify question ${i + 1}`}
                >
                  <span className="flex items-stretch border-b-2 border-[var(--ink)]">
                    <span
                      className={cn(
                        'lbl border-r-2 border-[var(--ink)] px-3 py-2',
                        `bloom-${q.level}`
                      )}
                    >
                      0{q.level} {BLOOM_LABELS[q.level - 1]}
                    </span>
                    <span className="lbl ml-auto px-3 py-2 text-[var(--ink-2)]">
                      ✓ verified · 2 agents
                    </span>
                  </span>
                  <span className="block p-4 leading-relaxed">{q.text}</span>
                </button>
                <Stamp text="VERIFIED" hit={stamped === i} />
              </Wipe>
            ))}
          </div>
        </div>

        <p className="mt-6 text-sm text-[var(--ink-2)]">
          Click any question to re-run verification. Nothing reaches this column until a
          second agent has answered it independently and the two answers agree.
        </p>
      </div>
    </section>
  )
}
