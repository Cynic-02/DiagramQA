'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { BLOOM_LABELS } from '@/lib/graph/layouts'
import { SectionHead, Wipe, Btn, Odometer, Spectrum } from './primitives'

/* ==================================================================
   04 — BLOOM'S TAXONOMY. Earn a teacher's trust.

   Six tiers of hard bordered blocks in spectrum order. Open one and it
   shows a real question written at that level. The section teaches
   while it sells, which is what "educational design" actually means —
   informational, not a font choice.
   ================================================================== */

const TIERS: { verb: string; example: string }[] = [
  { verb: 'Recall the parts, names and values the diagram states directly.', example: '"List the four chambers of the heart shown in the diagram."' },
  { verb: 'Restate what the diagram means in the student\'s own words.', example: '"Explain, in your own words, why the arrows in the diagram point in that direction."' },
  { verb: 'Use the diagram to solve something it does not state outright.', example: '"Use the circuit shown to calculate the current through R₃."' },
  { verb: 'Break the diagram apart and reason about how the pieces relate.', example: '"Compare the two pathways in the diagram and identify which is rate-limiting."' },
  { verb: 'Judge the diagram, or a claim made from it, against evidence.', example: '"Judge whether this model adequately explains the observed data. Justify."' },
  { verb: 'Build something new that the diagram only implies.', example: '"Design an experiment that would test the mechanism shown in this diagram."' },
]

export function Bloom() {
  const [open, setOpen] = React.useState<number | null>(0)

  return (
    <section
      id="bloom"
      data-section="04 — BLOOM'S TAXONOMY"
      className="relative z-10 rule-t px-6 sm:px-10 lg:px-16"
    >
      <div className="mx-auto max-w-[1200px] pb-20">
        <SectionHead n="04" title="BLOOM'S TAXONOMY" tag="six levels, not one">
          Most generators produce recall questions and call it a question set. Every run
          here is conditioned on all six cognitive levels, so a worksheet moves a class up
          the taxonomy instead of testing memory six times.
        </SectionHead>

        <ol className="joined">
          {TIERS.map((t, i) => {
            const isOpen = open === i
            return (
              <li key={i} className="border-[3px] border-[var(--ink)] bg-[var(--card)]">
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className={cn(
                    'flex w-full items-stretch text-left transition-transform duration-[90ms]',
                    'hover:translate-x-[10px]'
                  )}
                >
                  <span
                    className={cn(
                      'grid w-[76px] flex-none place-items-center border-r-[3px] border-[var(--ink)]',
                      `bloom-${i + 1}`
                    )}
                  >
                    <span className="d-s">0{i + 1}</span>
                  </span>
                  <span className="min-w-0 flex-1 px-5 py-4">
                    <span className="d-s block">{BLOOM_LABELS[i].toUpperCase()}</span>
                    <span className="mt-1.5 block text-sm leading-relaxed text-[var(--ink-2)]">
                      {t.verb}
                    </span>
                    <span
                      className="dat mt-3 block overflow-hidden text-sm leading-relaxed transition-[max-height,opacity] duration-[320ms] ease-[cubic-bezier(.16,1,.3,1)]"
                      style={{ maxHeight: isOpen ? 140 : 0, opacity: isOpen ? 1 : 0 }}
                    >
                      <span className="text-[var(--red)]">›</span> {t.example}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}

/* ==================================================================
   05 — TEACHERS / STUDENTS. Segment.
   ================================================================== */
export function Audiences({ onStart }: { onStart: () => void }) {
  return (
    <section
      id="audiences"
      data-section="05 — WHO IT'S FOR"
      className="relative z-10 rule-t"
    >
      <div className="grid lg:grid-cols-2">
        <Wipe className="border-b-[4px] border-[var(--ink)] p-8 sm:p-12 lg:border-b-0 lg:border-r-[4px]">
          <span className="lbl bg-[var(--ink)] px-2.5 py-1.5 text-[var(--background)]">
            For teachers
          </span>
          <h3 className="d-l mt-6">STOP WRITING THE SAME WORKSHEET.</h3>
          <ul className="mt-6 space-y-3 text-[var(--ink-2)]">
            {[
              'Any diagram you already teach from becomes a graded question set.',
              'Six cognitive levels, so one sheet stretches the whole class.',
              'Every item pre-answered, so you get a mark scheme with it.',
              'Export to docx, csv or QTI — or print it, properly.',
            ].map((l) => (
              <li key={l} className="flex gap-3 leading-relaxed">
                <span className="mt-2 size-2 flex-none bg-[var(--red)]" aria-hidden />
                <span>{l}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <Btn variant="primary" onClick={onStart}>
              Start free →
            </Btn>
          </div>
        </Wipe>

        <Wipe delay={80} className="p-8 sm:p-12">
          <span className="lbl bg-[var(--ink)] px-2.5 py-1.5 text-[var(--background)]">
            For students
          </span>
          <h3 className="d-l mt-6">TEST YOURSELF ON WHAT YOU ACTUALLY SEE.</h3>
          <ul className="mt-6 space-y-3 text-[var(--ink-2)]">
            {[
              'Photograph a diagram from your notes and get questions back.',
              'Answers are checked before you see them, so you are not learning noise.',
              'Work up the levels instead of re-reading the same labels.',
              'Track which cognitive level you keep dropping marks at.',
            ].map((l) => (
              <li key={l} className="flex gap-3 leading-relaxed">
                <span className="mt-2 size-2 flex-none bg-[var(--blue)]" aria-hidden />
                <span>{l}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <Btn variant="default" onClick={onStart}>
              Try a diagram →
            </Btn>
          </div>
        </Wipe>
      </div>
    </section>
  )
}

/* ==================================================================
   06 — NUMBERS. Credibility, in tabular mono, rolled by odometer.
   ================================================================== */
const STATS = [
  { v: '31208', label: 'Questions verified', note: 'Every one answered twice before release.' },
  { v: '06', label: 'Cognitive levels', note: "Conditioned on Bloom's full taxonomy, every run." },
  { v: '94', label: 'Percent first-pass agreement', note: 'The rest are returned to generation, not shipped.' },
  { v: '00', label: 'Unverified items shipped', note: 'Disagreement blocks release. No exceptions.' },
]

export function Numbers() {
  return (
    <section
      id="numbers"
      data-section="06 — NUMBERS"
      className="relative z-10 rule-t px-6 sm:px-10 lg:px-16"
    >
      <div className="mx-auto max-w-[1200px] pb-20">
        <SectionHead n="06" title="NUMBERS" />
        <div className="joined grid sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="border-[3px] border-[var(--ink)] bg-[var(--card)] p-6">
              <div className="d-l" style={{ fontSize: 'clamp(2.4rem,4vw,3.4rem)' }}>
                <Odometer value={s.v} />
              </div>
              <p className="lbl mt-4 text-[var(--ink-2)]">{s.label}</p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--ink-2)]">{s.note}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ==================================================================
   07 — OBJECTIONS. Kill the doubt in public.
   ================================================================== */
const FAQ = [
  {
    q: 'Will it hallucinate?',
    a: "That is the whole reason for the verification agent. Generation never ships an item directly: a separate agent answers it cold, without seeing the intended answer, and the two are compared. Disagreement returns the item to generation instead of releasing it. First-pass agreement runs around 94% — the other 6% are regenerated, not published with a disclaimer.",
  },
  {
    q: 'Does it work on a photo of a textbook page?',
    a: 'Yes, within reason. Extraction reads structure — nodes, edges and labels — so a legible photograph of a printed diagram works. A blurred whiteboard at an angle does not, and the extraction stage tells you so rather than inventing structure that is not there.',
  },
  {
    q: 'Can I edit what it produces?',
    a: 'The extraction is editable before generation runs, so if the model misreads a label you fix it once and every downstream question inherits the correction. Individual questions can be regenerated, re-levelled, or converted between formats after the fact.',
  },
  {
    q: 'Whose model is it using, and who sees my material?',
    a: 'You bring your own provider key. The pipeline runs against the provider you configure, so your diagrams go where you have already decided they can go, and nothing is retained for training by us.',
  },
  {
    q: 'What formats does it export?',
    a: 'docx, csv, and QTI for import into an LMS — plus a print stylesheet that actually produces a usable worksheet and mark scheme, which is the format most teachers still want.',
  },
]

export function Objections() {
  const [open, setOpen] = React.useState<number | null>(0)
  return (
    <section
      id="objections"
      data-section="07 — OBJECTIONS"
      className="relative z-10 rule-t px-6 sm:px-10 lg:px-16"
    >
      <div className="mx-auto max-w-[900px] pb-20">
        <SectionHead n="07" title="OBJECTIONS">
          The questions worth answering are the sceptical ones.
        </SectionHead>
        <ol className="joined">
          {FAQ.map((f, i) => {
            const isOpen = open === i
            return (
              <li key={f.q} className="border-[3px] border-[var(--ink)] bg-[var(--card)]">
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="d-s">{f.q}</span>
                  <span
                    className="dat flex-none text-xl leading-none transition-transform duration-[90ms]"
                    style={{ transform: isOpen ? 'rotate(45deg)' : 'none' }}
                    aria-hidden
                  >
                    +
                  </span>
                </button>
                <div
                  className="overflow-hidden transition-[max-height,opacity] duration-[320ms] ease-[cubic-bezier(.16,1,.3,1)]"
                  style={{ maxHeight: isOpen ? 320 : 0, opacity: isOpen ? 1 : 0 }}
                >
                  <p className="border-t-2 border-[var(--ink)] px-5 py-4 leading-relaxed text-[var(--ink-2)]">
                    {f.a}
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}

/* ==================================================================
   08 — CTA + FOOTER. Convert.
   ================================================================== */
export function CloseCta({ onStart }: { onStart: () => void }) {
  return (
    <section
      id="cta"
      data-section="08 — START"
      className="relative z-10 rule-t rule-b bg-[var(--red)] px-6 py-20 text-white sm:px-10 lg:px-16"
    >
      <div className="mx-auto max-w-[1200px]">
        <h2 className="d-l max-w-[20ch]">TURN YOUR NEXT DIAGRAM INTO A QUESTION SET.</h2>
        <p className="mt-7 max-w-[58ch] text-lg leading-relaxed">
          Six agents, one pipeline, verified output. Start with any diagram you already
          have — no card, no setup, no sample data.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-4">
          <button
            onClick={onStart}
            className="dat border-[3px] border-[var(--ink)] bg-white px-7 py-4 text-xs font-bold uppercase tracking-[0.12em] text-[#0a0a0a] shadow-[6px_6px_0_var(--ink)] transition-[transform,box-shadow] duration-[90ms] ease-[cubic-bezier(.2,0,0,1)] hover:translate-x-[6px] hover:translate-y-[6px] hover:shadow-none"
          >
            Start free →
          </button>
        </div>
      </div>
    </section>
  )
}

export function SiteFooter() {
  return (
    <footer className="relative z-10 bg-[var(--background)] px-6 py-12 sm:px-10 lg:px-16">
      <div className="mx-auto grid max-w-[1200px] gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="d-s">DIAGRAMMIND</p>
          <p className="mt-3 max-w-[34ch] text-sm leading-relaxed text-[var(--ink-2)]">
            Turn any diagram into a verified question set. Six agents, one pipeline.
          </p>
          <Spectrum className="mt-5 h-6 max-w-[220px]" />
        </div>
        {[
          { h: 'Product', l: ['Console', 'Pipeline', 'Agents', 'Exports'] },
          { h: 'Learn', l: ["Bloom's taxonomy", 'Verification', 'Extraction', 'Changelog'] },
          { h: 'Account', l: ['Sign in', 'Create account', 'API keys', 'Settings'] },
        ].map((c) => (
          <div key={c.h}>
            <p className="lbl text-[var(--ink-2)]">{c.h}</p>
            <ul className="mt-4 space-y-2.5">
              {c.l.map((x) => (
                <li key={x}>
                  <span className="dat text-sm hover:text-[var(--red)]">{x}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-12 flex max-w-[1200px] flex-wrap items-center justify-between gap-4 border-t-2 border-[var(--ink)] pt-6">
        <span className="lbl text-[var(--ink-2)]">DiagramMind · RUBRIC v1.0</span>
        <span className="lbl text-[var(--ink-2)]">Ink, paper, and a red marking pen.</span>
      </div>
    </footer>
  )
}
