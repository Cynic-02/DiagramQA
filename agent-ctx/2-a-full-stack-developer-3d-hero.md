# Task 2-a — full-stack-developer (3D hero)

Work record for the AR2-DDCQG 3D Hero section. See `/home/z/my-project/worklog.md`
for the cross-agent summary.

## Files created

- `src/components/three/Hero3D.tsx` — default-exported client component. Owns its
  `<section id="hero" className="relative min-h-screen ...">`. Accepts
  `{ onEnterConsole?: () => void }`. Wraps the 3D Canvas (or fallback) plus the
  hero text overlay. Handles WebGL/low-end detection, prefers-reduced-motion,
  scroll-driven camera/opacity, and canvas unmount past the hero.

- `src/components/three/DiagramGraphScene.tsx` — R3F `<Canvas>` + `<GraphGroup>`.
  Exports `DiagramGraphScene({ cameraZ, groupRotY, reducedMotion })`. Animates
  14 nodes (4 labeled INPUT/PARSER/GRAPH/QA) through scattered → flat (z=0) →
  3D graph phases, with 23 edges and billboarded text labels. Single `useFrame`
  drives all per-frame work.

- `src/components/three/HeroFallback.tsx` — static SVG fallback (no WebGL).
  Same diagram→graph concept as a hand-tuned SVG with a CSS glow.

## Export contract

```tsx
// src/components/three/Hero3D.tsx
export interface Hero3DProps {
  onEnterConsole?: () => void
}
export default function Hero3D({ onEnterConsole }: Hero3DProps): JSX.Element
```

## Page integration (for the orchestrator)

```tsx
// src/app/page.tsx
'use client'
import dynamic from 'next/dynamic'

const Hero3D = dynamic(() => import('@/components/three/Hero3D'), { ssr: false })

export default function Page() {
  return (
    <>
      <Hero3D />
      <section id="console">{/* ...app console... */}</section>
    </>
  )
}
```

The "Begin" button smooth-scrolls to `#console`. If `#console` isn't present
yet (e.g., during partial build), it falls back to `window.scrollBy` by one
viewport height, then calls `onEnterConsole?.()`.

## Lint / type status

- `bun run lint` — clean (0 errors, 0 warnings).
- `bunx tsc --noEmit` — 0 errors in `src/components/three/*`. Pre-existing
  errors elsewhere (examples/, skills/, src/lib/store.ts) were NOT touched
  per the orchestrator's "do not mutate types/store/bloom" rule.

## Notes / deviations

- Used `state.camera` from `useFrame` instead of `useThree()` to satisfy the
  `react-hooks/immutability` rule. All camera mutations go through
  `camera.position.set(...)` rather than direct property writes.
- WebGL/low-end detection runs in lazy `useState(() => ...)` initializers
  (SSR-guarded) to satisfy `react-hooks/set-state-in-effect`.
- Did NOT use drei `<Float>` — chose per-node breathing oscillation written
  into the shared `positionsRef` so edges stay perfectly synced with the
  highlight nodes. Visual goal (organic motion on a few highlight nodes) is
  preserved; flagged in the worklog for transparency.
- drei `<Text>` uses troika's default font (loaded from gstatic). If the
  sandbox blocks it, labels silently no-op — the diagram→graph narrative
  still works through nodes + edges alone.
