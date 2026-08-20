'use client'

import * as React from 'react'
import Link from 'next/link'
import { useTheme } from 'next-themes'

import type { PlateHandle } from '@/lib/plate/engine'

/* ==================================================================
   THE HOMEPAGE

   A faithful port of the authored page. Eight sections, one per plate,
   in an alternating editorial rhythm: the copy holds one half of the
   screen and the diagram the other, and they swap sides on every
   section so the ink has somewhere to travel to.

   Layer 0 is the plate stage. It owns the scene rail, the progress
   bar, the breadcrumb and the copy's own entrance choreography — all
   of it driven from the same scroll number, so nothing on this page
   can drift out of step with anything else on it.

   What the port adds over the prototype: the theme button is the app's
   real next-themes toggle, "Sign in" and "Start free" are Next links to
   the real /login, and the engine is torn down on unmount instead of
   running forever.
   ================================================================== */

/* ---- section copy. Each entry is one plate. ---- */
const SECTIONS = [
  {
    id: undefined as string | undefined,
    side: 'right',
    name: '01 — THE GLOBE',
    kick: 'Diagram → assessment',
    head: ['TURN ANY', 'DIAGRAM INTO', 'QUESTIONS.'],
    accentLast: true,
    level: 1 as 1 | 2,
  },
  {
    id: undefined,
    side: 'left',
    name: '02 — ANY SUBJECT',
    kick: 'Any subject',
    head: ['BIOLOGY.', 'PHYSICS.', 'ENGINEERING.'],
    level: 2 as const,
  },
  {
    id: undefined,
    side: 'right',
    name: '03 — THE THESIS',
    kick: 'The thesis',
    head: ['A DIAGRAM', 'IS A GRAPH.'],
    level: 2 as const,
  },
  {
    id: 'pipeline',
    side: 'left',
    name: '04 — THE PIPELINE',
    kick: 'The pipeline',
    head: ['SIX AGENTS,', 'ONE RUN.'],
    level: 2 as const,
  },
  {
    id: undefined,
    side: 'right',
    name: "05 — BLOOM'S TAXONOMY",
    kick: 'Coverage',
    head: ['ALL SIX', 'LEVELS. ALWAYS.'],
    level: 2 as const,
  },
  {
    id: undefined,
    side: 'left',
    name: '06 — NUMBERS',
    kick: 'Numbers',
    head: ['WHAT A RUN', 'ACTUALLY COSTS.'],
    level: 2 as const,
  },
  {
    id: undefined,
    side: 'right',
    name: "07 — WHO IT'S FOR",
    kick: "Who it's for",
    head: ['TEACHERS WHO', 'ALREADY HAVE', 'THE DIAGRAM.'],
    level: 2 as const,
  },
  {
    id: 'start',
    side: 'left',
    name: '08 — START',
    kick: 'Start',
    head: ['YOUR NEXT', 'DIAGRAM IS', 'A QUESTION SET.'],
    level: 2 as const,
  },
]

const PIPELINE = [
  ['01', 'b1', 'Ingest', 'Reads the file, normalises it, finds the drawing.'],
  ['02', 'b2', 'Vision', 'Parses entities, relationships and spatial layout into a graph.'],
  ['03', 'b3', 'Generator', 'Writes questions conditioned on each Bloom level.'],
  ['04', 'b4', 'Answerer', 'Answers each question independently, from the structure only.'],
  ['05', 'b5', 'Verifier', 'A second agent checks every answer and flags what it cannot support.'],
  ['06', 'b6', 'Reporter', 'Filters, edits, exports. You get a set, not a draft.'],
]

const AUDIENCES = [
  ['A', 'b2', 'Science teachers', 'Every textbook figure becomes a differentiated worksheet in under a minute.'],
  ['B', 'b4', 'Lecturers & TAs', 'Turn a lecture schematic into a problem set and an exam bank from the same source.'],
  ['C', 'b6', 'Curriculum teams', 'Audit coverage across a whole unit — the Bloom split is the report.'],
]

const RAIL = [
  '01 Globe', '02 Cell', '03 Atom', '04 Circuit',
  '05 Orbit', '06 Cycle', '07 Neuron', '08 Network',
]

const NUMBERS: Array<[number, string, string]> = [
  [24, '', 'questions per run'],
  [98, '%', 'verified first pass'],
  [41, 's', 'median run time'],
  [6, '', 'bloom levels covered'],
]

export default function Landing() {
  const stageRef = React.useRef<HTMLDivElement | null>(null)
  const plateRef = React.useRef<PlateHandle | null>(null)
  const [scrub, setScrub] = React.useState<number | null>(null)

  /* ---- mount the plate stage ---- */
  React.useEffect(() => {
    const host = stageRef.current
    if (!host) return
    let handle: PlateHandle | null = null
    let dead = false

    import('@/lib/plate/engine')
      .then(({ mountPlateStage }) => {
        if (dead || !stageRef.current) return
        handle = mountPlateStage(stageRef.current, {
          sectionSelector: '.plate-home section.scn',
          ids: { progress: 'plateProg', crumb: 'plateCrumb', pct: 'platePct', rail: 'plateRail' },
          choreograph: true,
        })
        plateRef.current = handle
      })
      .catch((err) => {
        // A backdrop is never worth a blank page.
        console.warn('[plate] stage unavailable', err)
      })

    return () => {
      dead = true
      handle?.destroy()
      plateRef.current = null
    }
  }, [])

  /* ---- the scrubber: hold the sequence anywhere and inspect it ---- */
  const toggleScrub = React.useCallback(() => {
    setScrub((cur) => {
      const next = cur === null ? (plateRef.current?.progress() ?? 0) : null
      plateRef.current?.setScrub(next)
      return next
    })
  }, [])

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && t.closest('input, textarea, select, [contenteditable]')) return
      const k = e.key.toLowerCase()
      if (k === 'd') toggleScrub()
      if (k === 'm') plateRef.current?.setEcho(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleScrub])

  return (
    <div className="plate-home">
      {/* ---- layer 0 : the diagram sequence ---- */}
      <div ref={stageRef} className="plate-stage" aria-hidden />

      {/* ---- chrome : the document header ---- */}
      <div className="chrome">
        <span className="crumb" id="plateCrumb">
          DIAGRAMMIND // 01 — THE GLOBE
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span id="platePct" style={{ opacity: 0.6 }}>
            000%
          </span>
          <ThemeBtn />
          <button type="button" onClick={toggleScrub} title="Scrub the scroll (D)">
            Scrub
          </button>
          <Link className="sign" href="/login">
            Sign in
          </Link>
        </div>
        <div className="chromeprog" id="plateProg" />
      </div>

      <main>
        {SECTIONS.map((s, i) => (
          <section key={i} className="scn" data-i={i} data-side={s.side} data-section={s.name} id={s.id}>
            <div className="col">
              <div className="kick">
                <span className="lbl">{s.kick}</span>
                <i className="rule" />
              </div>

              {s.level === 1 ? (
                <h1>
                  {s.head.map((line, j) => (
                    <span className="mask" key={j}>
                      <span style={s.accentLast && j === s.head.length - 1 ? { color: 'var(--red)' } : undefined}>
                        {line}
                      </span>
                    </span>
                  ))}
                </h1>
              ) : (
                <h2>
                  {s.head.map((line, j) => (
                    <span className="mask" key={j}>
                      <span>{line}</span>
                    </span>
                  ))}
                </h2>
              )}

              {i === 0 && (
                <>
                  <p className="lead fade">
                    Upload the diagram you already teach from. Six agents read its structure, write
                    questions across all six Bloom levels, and{' '}
                    <span className="marker">verify every answer</span> before you ever see it.
                  </p>
                  <div className="cta fade">
                    <Link className="btn" href="/login">
                      Start free →
                    </Link>
                    <a className="btn sec" href="#pipeline">
                      See how it works
                    </a>
                  </div>
                  <p className="fade" style={{ marginTop: 26 }}>
                    <span className="hand">keep scrolling — it works on anything you can draw</span>
                  </p>
                </>
              )}

              {i === 1 && (
                <>
                  <p className="lead fade">
                    The model has no idea what a cell is. It reads <span className="marker">structure</span> —
                    parts, connections, containment, flow — so the same six agents work on a membrane, a
                    circuit and an orbit without one subject-specific rule between them.
                  </p>
                  <p className="lead fade" style={{ marginTop: 14 }}>
                    Every plate on this page is the same pipeline, pointed at a different figure.
                  </p>
                </>
              )}

              {i === 2 && (
                <>
                  <p className="lead fade">
                    A question is an edge you remove and ask someone to put back. That is the whole idea —
                    and it is why this works on a cell, an atom, a circuit, an orbit or a food web without
                    changing a line of the model.
                  </p>
                  <p className="lead fade" style={{ marginTop: 14 }}>
                    Structure first, wording second. Everything else follows from the graph.
                  </p>
                </>
              )}

              {i === 3 && (
                <div className="stack">
                  {PIPELINE.map(([n, tone, title, desc]) => (
                    <div className="row" key={n}>
                      <b>{n}</b>
                      <span className="dot" style={{ background: `var(--${tone})` }} />
                      <span>
                        <span className="t">{title}</span>
                        <br />
                        <span className="d">{desc}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {i === 4 && (
                <>
                  <p className="lead fade">
                    Most generated question sets cluster at Remember and Understand because those are the
                    easy ones to write. Ours are conditioned per level, so a set is never top-heavy.
                  </p>
                  <div className="pills fade">
                    <span className="pill p1">01 Remember</span>
                    <span className="pill p2">02 Understand</span>
                    <span className="pill p3">03 Apply</span>
                    <span className="pill p4">04 Analyze</span>
                    <span className="pill p5">05 Evaluate</span>
                    <span className="pill p6">06 Create</span>
                  </div>
                </>
              )}

              {i === 5 && (
                <>
                  <div className="nums fade">
                    {NUMBERS.map(([to, suffix, label]) => (
                      <div key={label}>
                        <Odometer to={to} suffix={suffix} />
                        <span className="lbl">{label}</span>
                      </div>
                    ))}
                  </div>
                  <p className="lead fade" style={{ marginTop: 24 }}>
                    The verifier rejects roughly one question in twenty-five. Those get rewritten and
                    re-checked before the set is handed over — you never see the rejected one.
                  </p>
                </>
              )}

              {i === 6 && (
                <div className="stack">
                  {AUDIENCES.map(([n, tone, title, desc]) => (
                    <div className="row" key={n}>
                      <b>{n}</b>
                      <span className="dot" style={{ background: `var(--${tone})` }} />
                      <span>
                        <span className="t">{title}</span>
                        <br />
                        <span className="d">{desc}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {i === 7 && (
                <>
                  <p className="lead fade">
                    Free to try. No card. Bring one figure and see the whole run.
                  </p>
                  <div className="cta fade">
                    <Link className="btn" href="/login">
                      Create account →
                    </Link>
                    <Link className="btn sec" href="/login">
                      Sign in
                    </Link>
                  </div>
                </>
              )}
            </div>
          </section>
        ))}
      </main>

      {/* ---- the scene rail ---- */}
      <div className="rail" id="plateRail" aria-hidden>
        {RAIL.map((label) => (
          <div className="bt" key={label}>
            <span>{label}</span>
            <i />
          </div>
        ))}
      </div>

      {scrub !== null && (
        <div className="plate-scrub on">
          <span>Scroll scrub</span>
          <input
            type="range"
            min={0}
            max={1000}
            value={Math.round(scrub * 1000)}
            onChange={(e) => {
              const v = Number(e.target.value) / 1000
              plateRef.current?.setScrub(v)
              setScrub(v)
            }}
          />
          <span>{scrub.toFixed(3)}</span>
          <span style={{ opacity: 0.5 }}>D to exit</span>
        </div>
      )}

      <footer>
        <div>
          <div className="wm">DIAGRAMMIND</div>
          <span className="lbl">One plate · six questions · verified</span>
          <div className="spectrum">
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
        </div>
        <div style={{ maxWidth: '34ch' }}>
          <p style={{ fontSize: 12.5, color: 'var(--ink-2)', margin: 0 }}>
            Eight diagrams drawn from numbers, not files. Nothing on this page was fetched as an image.
          </p>
          <span className="hand">scroll back up — every stroke un-draws</span>
        </div>
      </footer>
    </div>
  )
}

/* ------------------------------------------------------------------
   The theme button. Same glyph as the prototype, but it drives the
   app's real next-themes provider so the choice survives the route.
   ------------------------------------------------------------------ */
function ThemeBtn() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  const dark = mounted && resolvedTheme === 'dark'

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && t.closest('input, textarea, select, [contenteditable]')) return
      if (e.key.toLowerCase() === 't') setTheme(dark ? 'light' : 'dark')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dark, setTheme])

  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      title="Toggle theme (T)"
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {mounted ? (dark ? '☀' : '☾') : '☾'}
    </button>
  )
}

/* ------------------------------------------------------------------
   The odometer. Counts once, when it first comes into view.
   ------------------------------------------------------------------ */
function Odometer({ to, suffix }: { to: number; suffix: string }) {
  const ref = React.useRef<HTMLElement | null>(null)
  const [n, setN] = React.useState(0)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setN(to)
      return
    }
    let raf = 0
    const io = new IntersectionObserver(
      (es) => {
        if (!es[0]?.isIntersecting) return
        io.disconnect()
        const t0 = performance.now()
        const step = (now: number) => {
          const t = Math.min((now - t0) / 1500, 1)
          setN(Math.round((1 - Math.pow(1 - t, 3)) * to))
          if (t < 1) raf = requestAnimationFrame(step)
        }
        raf = requestAnimationFrame(step)
      },
      { threshold: 0.5 }
    )
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [to])

  return (
    <b ref={ref as never}>
      {n.toLocaleString()}
      {suffix}
    </b>
  )
}
