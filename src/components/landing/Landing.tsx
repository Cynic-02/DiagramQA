'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

import { graphBeat } from '@/lib/graph/beat'
import { ThemeToggle } from '@/components/theme-toggle'
import { Hero } from './Hero'
import { Proof } from './Proof'
import { Pipeline } from './Pipeline'
import { Bloom, Audiences, Numbers, Objections, CloseCta, SiteFooter } from './Sections'

/* The one Tier-3 element on the page. Client-only, and it never
   re-renders React — scroll writes to a module singleton that the
   engine reads once per frame. */
const GraphEngine = dynamic(() => import('@/components/graph/GraphEngine'), {
  ssr: false,
})

/* Beat anchors. Each id is a formation; scrolling between two of them
   interpolates. Pure function of scroll position, so scrubbing is
   exact and scrolling back up reconstructs the previous formation. */
const BEATS = ['hero', 'proof', 'pipeline', 'cta'] as const

export default function Landing() {
  const router = useRouter()
  const graphRef = React.useRef<HTMLDivElement | null>(null)
  const [docTitle, setDocTitle] = React.useState('01 — THE THESIS')
  const [pct, setPct] = React.useState(0)

  const goConsole = React.useCallback(() => router.push('/login'), [router])
  const goProof = React.useCallback(() => {
    document.getElementById('proof')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  /* ---- scroll → beat, doc header, graph presence. One rAF, no
          React re-render for the beat itself. ---- */
  React.useEffect(() => {
    let queued = false
    let raf = 0

    const read = () => {
      queued = false
      const y = window.scrollY + window.innerHeight * 0.42

      // beat: find the anchor pair we are between and lerp
      const tops = BEATS.map((id) => {
        const el = document.getElementById(id)
        return el ? el.getBoundingClientRect().top + window.scrollY : Number.POSITIVE_INFINITY
      })
      let beat = 0
      for (let i = 0; i < tops.length - 1; i++) {
        if (y >= tops[i] && y < tops[i + 1]) {
          const span = tops[i + 1] - tops[i]
          beat = i + (span > 0 ? (y - tops[i]) / span : 0)
          break
        }
        if (y >= tops[tops.length - 1]) beat = tops.length - 1
      }
      graphBeat.value = Math.min(Math.max(beat, 0), BEATS.length - 1)

      // graph presence: full in the hero, a watermark after it
      const heroEnd = tops[1] || window.innerHeight
      const t = Math.min(Math.max((window.scrollY - heroEnd * 0.35) / (heroEnd * 0.5), 0), 1)
      if (graphRef.current) {
        graphRef.current.style.opacity = String(1 - t * 0.84)
      }

      // document header — this is a page header on a printed paper
      const secs = Array.from(document.querySelectorAll<HTMLElement>('[data-section]'))
      let current = secs[0]?.dataset.section ?? ''
      for (const s of secs) {
        if (s.getBoundingClientRect().top < 140) current = s.dataset.section ?? current
      }
      setDocTitle(current)

      const max = document.body.scrollHeight - window.innerHeight
      setPct(max > 0 ? Math.min(100, Math.round((window.scrollY / max) * 100)) : 0)
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
    <div className="relative min-h-screen">
      {/* ---- layer 0: the graph ---- */}
      <div
        ref={graphRef}
        className="pointer-events-none fixed inset-0 z-0 lg:left-[42%]"
        style={{ transition: 'opacity 120ms linear' }}
      >
        <GraphEngine className="h-full w-full" />
      </div>

      {/* ---- the document header. Brutalist, educational, and useful
              navigation: it tells you where in the paper you are. ---- */}
      <div className="sticky top-0 z-40 flex items-center justify-between gap-4 bg-[var(--ink)] px-6 py-2.5 text-[var(--background)] sm:px-10 lg:px-16">
        <span className="lbl truncate">DIAGRAMMIND // {docTitle}</span>
        <div className="flex items-center gap-4">
          <span className="lbl hidden tabular-nums sm:inline">
            {String(pct).padStart(3, '0')}%
          </span>
          <ThemeToggle />
        </div>
      </div>

      <Hero onStart={goConsole} onProof={goProof} />
      <Proof />
      <Pipeline />
      <Bloom />
      <Audiences onStart={goConsole} />
      <Numbers />
      <Objections />
      <CloseCta onStart={goConsole} />
      <SiteFooter />
    </div>
  )
}
