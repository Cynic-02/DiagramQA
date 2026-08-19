'use client'

import { LoaderFive } from '@/components/ui/loader'

/* ============================================================
   RouteLoading — shown by Next.js automatically during route
   transitions/data-fetching (see loading.tsx files per route).
   Echoes the hero's particle/orb aesthetic but as lightweight
   CSS/SVG rather than a fresh WebGL context, so it appears
   instantly rather than adding its own startup latency.
   ============================================================ */

const DOTS = [
  { cx: 60, cy: 90, r: 3 },
  { cx: 140, cy: 55, r: 4 },
  { cx: 210, cy: 95, r: 2.5 },
  { cx: 100, cy: 150, r: 3.5 },
  { cx: 175, cy: 155, r: 2.5 },
  { cx: 240, cy: 140, r: 3 },
  { cx: 40, cy: 160, r: 2 },
]

const LINES: [number, number][] = [
  [0, 1],
  [1, 2],
  [0, 3],
  [1, 3],
  [3, 4],
  [4, 5],
  [3, 6],
]

export default function RouteLoading() {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background">
      {/* Ambient orbs — same soft warm/violet wash as the hero, muted */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden opacity-60">
        <div className="hw-orb-1" />
        <div className="hw-orb-2" />
      </div>

      <div className="relative flex flex-col items-center gap-6">
        <svg
          width="280"
          height="200"
          viewBox="0 0 280 200"
          className="route-loading-svg"
          aria-hidden
        >
          {LINES.map(([a, b], i) => (
            <line
              key={i}
              x1={DOTS[a].cx}
              y1={DOTS[a].cy}
              x2={DOTS[b].cx}
              y2={DOTS[b].cy}
              pathLength={1}
              className="route-loading-line"
              style={{ animationDelay: `${i * 90}ms` }}
            />
          ))}
          {DOTS.map((d, i) => (
            <circle
              key={i}
              cx={d.cx}
              cy={d.cy}
              r={d.r}
              className="route-loading-dot"
              style={{ animationDelay: `${i * 110}ms` }}
            />
          ))}
        </svg>

        <LoaderFive text="Loading..." />
      </div>
    </div>
  )
}
