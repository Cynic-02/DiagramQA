'use client'

import { useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

/* ============================================================
   BlueprintScene — a hand-drawn system diagram that draws itself,
   gets verified, and redraws in a continuous calm loop.

   v3: expanded from a 4-shape row into an 8-node pipeline (input →
   extraction → knowledge graph → branch diamond → generation →
   question bank → verification → verified store, plus a revision
   arrow looping back into extraction), framed by four hand-drawn
   corner brackets and a faint static drafting-grid backdrop so the
   whole thing reads as a single blueprint sheet rather than shapes
   floating in space. Each arrow now ends in a small hand-drawn
   connector ring where it meets the next node. Arrow strokes are
   given a longer, slower dwell than the original pass per feedback
   that they read as too fast.

   Every stroke is still revealed by walking its own arc length each
   frame (never snapped to a vertex), with a glowing nib marking the
   live pen position, so it reads as a continuously moving pen tip.
   Once a shape's strokes finish, a thin gold scanline sweeps across
   it and the ink flips from raw sketch blue-grey to the theme's
   verified accent — dramatizing this product's own pipeline
   (extract the shape, then verify it).
   ============================================================ */

function readPalette() {
  if (typeof document === 'undefined') {
    return { ink: '#5b6578', verified: '#3ba4c7', scan: '#f0b84a', bg: '#0e1219' }
  }
  const style = getComputedStyle(document.documentElement)
  const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback
  return {
    ink: read('--text-muted', '#5b6578'),
    verified: read('--primary', '#3ba4c7'),
    scan: read('--diagram-gold', '#f0b84a'),
    bg: read('--background', '#0e1219'),
  }
}
/* ---- Path generators — each shape returns an array of SUB-PATHS,
   where a sub-path is an ordered polyline drawn in one continuous
   pen motion. Splitting a shape into several sub-paths (outline
   loop + divider, say) lets the timeline stagger them so the pen
   visibly lifts and moves between strokes. ---- */

type SubPath = number[][]
type ShapePaths = SubPath[]

function rectLoop(w: number, h: number, z = 0): SubPath {
  const hw = w / 2
  const hh = h / 2
  return [[-hw, hh, z], [hw, hh, z], [hw, -hh, z], [-hw, -hh, z], [-hw, hh, z]]
}

function rectPaths(w: number, h: number, z = 0): ShapePaths {
  return [rectLoop(w, h, z)]
}

/** ER-style entity box: outer rect loop, then a header divider drawn
    as its own stroke once the outline is closed. */
function erBoxPaths(w: number, h: number, z = 0): ShapePaths {
  const hw = w / 2
  const hh = h / 2
  const dividerY = hh - h * 0.28
  return [rectLoop(w, h, z), [[-hw, dividerY, z], [hw, dividerY, z]]]
}

/** Database cylinder: top ellipse, down the left wall, the bottom
    ellipse, then up the right wall — the order a hand actually
    draws a barrel glyph in. */
function cylinderPaths(w: number, h: number, z = 0): ShapePaths {
  const hw = w / 2
  const hh = h / 2
  const ellipseH = h * 0.16
  const segs = 20
  const ellipse = (cy: number): SubPath => {
    const out: SubPath = []
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2
      out.push([Math.cos(a) * hw, cy + Math.sin(a) * ellipseH, z])
    }
    return out
  }
  const topY = hh - ellipseH
  const botY = -hh + ellipseH
  return [ellipse(topY), [[-hw, topY, z], [-hw, botY, z]], ellipse(botY), [[hw, botY, z], [hw, topY, z]]]
}

/** Decision/junction diamond — a single closed four-point loop, the
    classic flowchart branch glyph. */
function diamondLoop(w: number, h: number, z = 0): SubPath {
  const hw = w / 2
  const hh = h / 2
  return [[0, hh, z], [hw, 0, z], [0, -hh, z], [-hw, 0, z], [0, hh, z]]
}

function diamondPaths(w: number, h: number, z = 0): ShapePaths {
  return [diamondLoop(w, h, z)]
}

function circleLoop(cx: number, cy: number, r: number, z: number, segs = 12): SubPath {
  const out: SubPath = []
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, z])
  }
  return out
}
/** Arrow from shape a to shape b: the shaft, then each head barb,
    then a small connector ring right at the tip — drawn in sequence
    so the arrowhead reads as a quick flick at the end of the stroke
    and the ring reads as the wire seating into the next node. */
function arrowPaths(a: [number, number, number], b: [number, number, number]): ShapePaths {
  const [ax, ay, az] = a
  const [bx, by, bz] = b
  const dx = bx - ax
  const dy = by - ay
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const shorten = 0.6
  const ex = ax + ux * (len - shorten)
  const ey = ay + uy * (len - shorten)
  const headLen = 0.32
  const headSpread = 0.16
  const nx = -uy
  const ny = ux
  const h1x = ex - ux * headLen + nx * headSpread
  const h1y = ey - uy * headLen + ny * headSpread
  const h2x = ex - ux * headLen - nx * headSpread
  const h2y = ey - uy * headLen - ny * headSpread
  return [
    [[ax, ay, az], [ex, ey, bz]],
    [[ex, ey, bz], [h1x, h1y, bz]],
    [[ex, ey, bz], [h2x, h2y, bz]],
    circleLoop(ex, ey, 0.07, bz, 10),
  ]
}

interface ShapeDef {
  kind: 'rect' | 'er' | 'cylinder' | 'diamond'
  x: number
  y: number
  z: number
  w: number
  h: number
  label: string
}

/** The full pipeline: upload → extraction → knowledge graph → a
    branch decision → question generation → question bank →
    verification → verified store, with a revision arrow looping
    back from verification into extraction. Varied shape kinds and
    staggered y-offsets keep it reading as a real system diagram
    rather than a flat row of boxes. */
const SHAPES: ShapeDef[] = [
  { kind: 'rect', x: -6.2, y: 2.0, w: 2.0, h: 1.0, z: 0, label: 'diagram' },
  { kind: 'er', x: -3.6, y: 2.6, w: 2.3, h: 1.4, z: 0, label: 'extract' },
  { kind: 'cylinder', x: -1.0, y: 1.9, w: 1.6, h: 1.6, z: 0, label: 'graph' },
  { kind: 'diamond', x: 1.7, y: 2.6, w: 1.9, h: 1.5, z: 0, label: 'branch' },
  { kind: 'rect', x: 4.5, y: 1.9, w: 2.2, h: 1.0, z: 0, label: 'generate' },
  { kind: 'er', x: 4.5, y: -1.1, w: 2.3, h: 1.3, z: 0, label: 'questions' },
  { kind: 'rect', x: 1.2, y: -1.9, w: 2.2, h: 1.0, z: 0, label: 'verify' },
  { kind: 'cylinder', x: -2.4, y: -1.9, w: 1.5, h: 1.5, z: 0, label: 'verified' },
]

const ARROWS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 1],
]

function shapeOutline(shape: ShapeDef): ShapePaths {
  if (shape.kind === 'er') return erBoxPaths(shape.w, shape.h, shape.z)
  if (shape.kind === 'cylinder') return cylinderPaths(shape.w, shape.h, shape.z)
  if (shape.kind === 'diamond') return diamondPaths(shape.w, shape.h, shape.z)
  return rectPaths(shape.w, shape.h, shape.z)
}
/* ---- Blueprint-sheet framing: four corner brackets plus a faint
   static drafting-grid, both derived from one shared bounding box so
   the diagram reads as a page rather than shapes adrift in space. ---- */

const FRAME_BOUNDS = { minX: -7.8, maxX: 6.2, minY: -3.2, maxY: 3.9 }
const FRAME_ARM = 0.85

function cornerBracket(cx: number, cy: number, armX: number, armY: number): SubPath {
  return [[cx, cy + armY, 0], [cx, cy, 0], [cx + armX, cy, 0]]
}

const CORNER_BRACKETS: SubPath[] = [
  cornerBracket(FRAME_BOUNDS.minX, FRAME_BOUNDS.maxY, FRAME_ARM, -FRAME_ARM),
  cornerBracket(FRAME_BOUNDS.maxX, FRAME_BOUNDS.maxY, -FRAME_ARM, -FRAME_ARM),
  cornerBracket(FRAME_BOUNDS.maxX, FRAME_BOUNDS.minY, -FRAME_ARM, FRAME_ARM),
  cornerBracket(FRAME_BOUNDS.minX, FRAME_BOUNDS.minY, FRAME_ARM, FRAME_ARM),
]

function buildGridPositions(bounds: typeof FRAME_BOUNDS, spacing: number): Float32Array {
  const lines: number[] = []
  const startX = Math.ceil(bounds.minX / spacing) * spacing
  for (let x = startX; x <= bounds.maxX; x += spacing) {
    lines.push(x, bounds.minY, -0.06, x, bounds.maxY, -0.06)
  }
  const startY = Math.ceil(bounds.minY / spacing) * spacing
  for (let y = startY; y <= bounds.maxY; y += spacing) {
    lines.push(bounds.minX, y, -0.06, bounds.maxX, y, -0.06)
  }
  return new Float32Array(lines)
}

/* ---- Arc-length helpers driving the continuous pen reveal. ---- */

function subPathLength(points: SubPath): number {
  let len = 0
  for (let i = 1; i < points.length; i++) {
    const [x0, y0, z0] = points[i - 1]
    const [x1, y1, z1] = points[i]
    len += Math.hypot(x1 - x0, y1 - y0, z1 - z0)
  }
  return len
}

/** Walks `points` and returns a flat list where every consecutive
    pair is one drawn segment, covering the first `targetLen` units
    of arc length. The very last point is interpolated to the exact
    fractional position along its segment — never snapped to the
    nearest vertex — which is what makes the reveal read as a
    continuously moving pen tip rather than segments popping in. */
function revealSegmentPairs(points: SubPath, targetLen: number): SubPath {
  if (targetLen <= 0 || points.length < 2) return []
  const out: SubPath = []
  let acc = 0
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1]
    const p1 = points[i]
    const segLen = Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2])
    if (acc + segLen <= targetLen) {
      out.push(p0, p1)
      acc += segLen
    } else {
      const remain = targetLen - acc
      const t = segLen === 0 ? 0 : remain / segLen
      out.push(p0, [
        p0[0] + (p1[0] - p0[0]) * t,
        p0[1] + (p1[1] - p0[1]) * t,
        p0[2] + (p1[2] - p0[2]) * t,
      ])
      break
    }
  }
  return out
}
/* ---- Timeline: fixed absolute durations per shape/arrow (not
   divided by count), so adding more nodes lengthens the overall
   sequence instead of making each stroke rush by faster. Arrows get
   a noticeably longer dwell than shapes per feedback that the arrow
   strokes read as too quick. ---- */

type StrokeTiming = { drawStart: number; drawEnd: number; verifyStart: number; verifyEnd: number }

function buildTimeline(shapeCount: number, arrowCount: number) {
  const shapeDraw = 0.0464
  const shapeStagger = 0.0348
  const verifyGap = 0.005
  const verifyDur = 0.0214
  const shapeTimings: StrokeTiming[] = []
  for (let i = 0; i < shapeCount; i++) {
    const drawStart = i * shapeStagger
    const drawEnd = drawStart + shapeDraw
    const verifyStart = drawEnd + verifyGap
    const verifyEnd = verifyStart + verifyDur
    shapeTimings.push({ drawStart, drawEnd, verifyStart, verifyEnd })
  }

  const lastShapeEnd = shapeTimings[shapeTimings.length - 1]?.verifyEnd ?? 0
  const arrowDraw = 0.0607
  const arrowStagger = 0.0546
  const arrowsStart = lastShapeEnd + 0.015
  const arrowTimings: StrokeTiming[] = []
  for (let i = 0; i < arrowCount; i++) {
    const drawStart = arrowsStart + i * arrowStagger
    const drawEnd = drawStart + arrowDraw
    arrowTimings.push({ drawStart, drawEnd, verifyStart: drawEnd, verifyEnd: drawEnd + 0.01 })
  }
  return { shapeTimings, arrowTimings }
}

/** Splits one shape's [drawStart, drawEnd] window across its
    sub-paths proportional to arc length, so the pen moves at a
    roughly constant speed across the whole shape instead of
    lingering on short strokes. */
function useSubTimings(paths: ShapePaths, timing: StrokeTiming) {
  return useMemo(() => {
    const lens = paths.map(subPathLength)
    const total = lens.reduce((a, b) => a + b, 0) || 1
    const span = timing.drawEnd - timing.drawStart
    let cursor = timing.drawStart
    return paths.map((_, i) => {
      const portion = (lens[i] / total) * span
      const start = cursor
      const end = cursor + Math.max(portion, span * 0.001)
      cursor = end
      return { start, end }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paths, timing.drawStart, timing.drawEnd])
}

/** Ease-in-out so each stroke accelerates off its start point and
    settles into the next, closer to real hand motion than a
    constant-speed linear reveal. */
function easeInOut(t: number) {
  return t * t * (3 - 2 * t)
}

type SceneColors = { ink: THREE.Color; verified: THREE.Color; scan: THREE.Color }
/** One shape's (or arrow's) full set of strokes. Each sub-path
    reveals as a continuously growing line from its own interpolated
    tip, with a small glowing nib marking the live pen position
    while it draws. Once every stroke completes, the ink flips to
    the verified color with a brief glow pulse. */
function HandDrawnShape({
  paths,
  timing,
  colors,
  cycleRef,
}: {
  paths: ShapePaths
  timing: StrokeTiming
  colors: SceneColors
  cycleRef: React.RefObject<number>
}) {
  const subTimings = useSubTimings(paths, timing)
  const lineRefs = useRef<(THREE.LineSegments | null)[]>([])
  const glowRefs = useRef<(THREE.LineSegments | null)[]>([])
  const tipRef = useRef<THREE.Mesh>(null)

  const buffers = useMemo(
    () => paths.map((p) => new Float32Array(Math.max((p.length - 1) * 2, 2) * 3)),
    [paths]
  )
  const lengths = useMemo(() => paths.map(subPathLength), [paths])

  useFrame(() => {
    const c = cycleRef.current ?? 0
    let tip: number[] | null = null

    paths.forEach((pts, i) => {
      const { start, end } = subTimings[i]
      const line = lineRefs.current[i]
      const glow = glowRefs.current[i]
      if (!line || !glow) return

      const raw = (c - start) / Math.max(1e-6, end - start)
      const clamped = Math.max(0, Math.min(1, raw))
      const eased = easeInOut(clamped)
      const revealed = revealSegmentPairs(pts, eased * lengths[i])

      const buf = buffers[i]
      revealed.forEach((p, idx) => buf.set(p, idx * 3))

      line.geometry.setDrawRange(0, revealed.length)
      ;(line.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true

      glow.geometry.setDrawRange(0, revealed.length)
      ;(glow.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true

      const mat = line.material as THREE.LineBasicMaterial
      mat.opacity = revealed.length > 0 ? 0.85 : 0

      if (raw > 0 && raw < 1 && revealed.length > 0) {
        tip = revealed[revealed.length - 1]
      }
    })

    const verifyT = (c - timing.verifyStart) / Math.max(1e-6, timing.verifyEnd - timing.verifyStart)
    const verifyClamped = Math.max(0, Math.min(1, verifyT))
    const pulse = Math.sin(Math.min(1, verifyClamped) * Math.PI)

    lineRefs.current.forEach((line) => {
      if (!line) return
      const mat = line.material as THREE.LineBasicMaterial
      mat.color.copy(colors.ink).lerp(colors.verified, verifyClamped)
    })
    glowRefs.current.forEach((glow) => {
      if (!glow) return
      const glowMat = glow.material as THREE.LineBasicMaterial
      glowMat.color.copy(colors.scan)
      glowMat.opacity = pulse * 0.5
    })

    if (tipRef.current) {
      if (tip) {
        tipRef.current.visible = true
        tipRef.current.position.set(tip[0], tip[1], tip[2])
        const tipMat = tipRef.current.material as THREE.MeshBasicMaterial
        tipMat.color.copy(colors.ink).lerp(colors.verified, verifyClamped)
      } else {
        tipRef.current.visible = false
      }
    }
  })

  return (
    <group>
      {paths.map((_, i) => (
        <group key={i}>
          <lineSegments ref={(el) => { glowRefs.current[i] = el }}>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[buffers[i], 3]} />
            </bufferGeometry>
            <lineBasicMaterial transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
          </lineSegments>
          <lineSegments ref={(el) => { lineRefs.current[i] = el }}>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[buffers[i], 3]} />
            </bufferGeometry>
            <lineBasicMaterial transparent opacity={0} depthWrite={false} />
          </lineSegments>
        </group>
      ))}
      <mesh ref={tipRef} visible={false}>
        <circleGeometry args={[0.05, 16]} />
        <meshBasicMaterial color={colors.ink} transparent opacity={0.95} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  )
}
/** A thin gold scanline mesh that sweeps left-to-right across a
    shape's bounding box during its verify window — the visible
    "checking" moment, distinct from the stroke color flip itself. */
function ScanSweep({
  shape,
  timing,
  scanColor,
  cycleRef,
}: {
  shape: ShapeDef
  timing: StrokeTiming
  scanColor: THREE.Color
  cycleRef: React.RefObject<number>
}) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame(() => {
    const mesh = meshRef.current
    if (!mesh) return
    const c = cycleRef.current ?? 0
    const t = (c - timing.verifyStart) / (timing.verifyEnd - timing.verifyStart)
    const clamped = Math.max(0, Math.min(1, t))
    const active = clamped > 0 && clamped < 1
    mesh.visible = active
    if (active) {
      const sweepX = shape.x - shape.w / 2 + clamped * shape.w
      mesh.position.set(sweepX, shape.y, shape.z + 0.01)
      const mat = mesh.material as THREE.MeshBasicMaterial
      mat.opacity = Math.sin(clamped * Math.PI) * 0.55
    }
  })

  return (
    <mesh ref={meshRef} visible={false}>
      <planeGeometry args={[0.045, shape.h * 1.08]} />
      <meshBasicMaterial color={scanColor} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </mesh>
  )
}

/** A static, non-verifying ink stroke used for the corner brackets —
    same arc-length reveal mechanic as HandDrawnShape, but no glow
    nib and no verify color-flip, since it's page framing rather
    than pipeline content. Quick to draw, then simply stays put. */
function InkFrameStroke({
  points,
  timing,
  inkColor,
  cycleRef,
}: {
  points: SubPath
  timing: StrokeTiming
  inkColor: THREE.Color
  cycleRef: React.RefObject<number>
}) {
  const lineRef = useRef<THREE.LineSegments>(null)
  const buffer = useMemo(
    () => new Float32Array(Math.max((points.length - 1) * 2, 2) * 3),
    [points]
  )
  const length = useMemo(() => subPathLength(points), [points])

  useFrame(() => {
    const line = lineRef.current
    if (!line) return
    const c = cycleRef.current ?? 0
    const raw = (c - timing.drawStart) / Math.max(1e-6, timing.drawEnd - timing.drawStart)
    const clamped = Math.max(0, Math.min(1, raw))
    const revealed = revealSegmentPairs(points, easeInOut(clamped) * length)
    revealed.forEach((p, idx) => buffer.set(p, idx * 3))
    line.geometry.setDrawRange(0, revealed.length)
    ;(line.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true
    const mat = line.material as THREE.LineBasicMaterial
    mat.opacity = revealed.length > 0 ? 0.3 : 0
  })

  return (
    <lineSegments ref={lineRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[buffer, 3]} />
      </bufferGeometry>
      <lineBasicMaterial color={inkColor} transparent opacity={0} depthWrite={false} />
    </lineSegments>
  )
}

/** Faint static drafting-grid behind the whole diagram — fixed
    geometry, constant low opacity, no per-frame animation. Reads as
    graph-paper texture under a blueprint, not as floating particles. */
function GridBackdrop({ color }: { color: THREE.Color }) {
  const positions = useMemo(() => buildGridPositions(FRAME_BOUNDS, 1.35), [])
  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial color={color} transparent opacity={0.05} depthWrite={false} />
    </lineSegments>
  )
}
/* ---- Cycle driver: loops 0..1 continuously at a slow ambient pace,
   speeding up somewhat while the user scrolls, then settling back
   down. Base speed is slower than the first pass so the larger
   8-node pipeline (and its longer arrow strokes) has room to
   breathe instead of feeling rushed. ---- */
function useCycle(reduceMotion: boolean) {
  const cycleRef = useRef(0)
  const speedRef = useRef(0.036)
  useFrame((_state, delta) => {
    if (reduceMotion) return
    if (typeof window !== 'undefined') {
      const scrollP = Math.min(1, Math.max(0, window.scrollY / (window.innerHeight * 0.7)))
      speedRef.current = 0.036 + scrollP * 0.06
    }
    cycleRef.current = (cycleRef.current + delta * speedRef.current) % 1
  })
  return cycleRef
}

/** Keeps the canvas rendering at least once when reduced-motion is
    on, since frameloop="demand" otherwise renders nothing at all. */
function FrameGovernor({ reduceMotion }: { reduceMotion: boolean }) {
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => {
    if (reduceMotion) invalidate()
  }, [reduceMotion, invalidate])
  return null
}

/** Assembles the full diagram: the drafting-grid backdrop and
    corner-bracket frame, each shape's hand-drawn strokes + scan
    sweep, and the connecting arrows (including the revision arrow
    looping from verification back into extraction), all driven off
    one shared cycle. A gentle whole-scene tilt follows the cursor
    and a slow ambient sway keeps it from ever looking frozen. */
function Scene({ colors, reduceMotion }: { colors: SceneColors; reduceMotion: boolean }) {
  const cycleRef = useCycle(reduceMotion)
  const groupRef = useRef<THREE.Group>(null)

  const { shapeTimings, arrowTimings } = useMemo(
    () => buildTimeline(SHAPES.length, ARROWS.length),
    []
  )

  const shapePathsList = useMemo(() => SHAPES.map(shapeOutline), [])

  const arrowPathList = useMemo(
    () =>
      ARROWS.map(([aIdx, bIdx]) => {
        const a = SHAPES[aIdx]
        const b = SHAPES[bIdx]
        return arrowPaths([a.x, a.y, a.z], [b.x, b.y, b.z])
      }),
    []
  )

  const cornerTiming: StrokeTiming = useMemo(
    () => ({ drawStart: 0, drawEnd: 0.02, verifyStart: 0.02, verifyEnd: 0.021 }),
    []
  )

  useFrame((state) => {
    const g = groupRef.current
    if (!g) return
    const sway = Math.sin(state.clock.elapsedTime * 0.05) * 0.035
    g.rotation.y = sway + state.pointer.x * 0.09
    g.rotation.x = -state.pointer.y * 0.06
  })

  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.55} />
      <pointLight position={[3, 2, 6]} intensity={12} color={colors.verified} distance={18} decay={2} />
      <pointLight position={[-4, -2, 5]} intensity={9} color={colors.scan} distance={18} decay={2} />

      <GridBackdrop color={colors.ink} />

      {CORNER_BRACKETS.map((pts, i) => (
        <InkFrameStroke key={`corner-${i}`} points={pts} timing={cornerTiming} inkColor={colors.ink} cycleRef={cycleRef} />
      ))}

      {SHAPES.map((shape, i) => (
        <group key={shape.label} position={[shape.x, shape.y, shape.z]}>
          <HandDrawnShape paths={shapePathsList[i]} timing={shapeTimings[i]} colors={colors} cycleRef={cycleRef} />
        </group>
      ))}

      {SHAPES.map((shape, i) => (
        <ScanSweep key={`scan-${shape.label}`} shape={shape} timing={shapeTimings[i]} scanColor={colors.scan} cycleRef={cycleRef} />
      ))}

      {arrowPathList.map((paths, i) => (
        <HandDrawnShape key={`arrow-${i}`} paths={paths} timing={arrowTimings[i]} colors={colors} cycleRef={cycleRef} />
      ))}
    </group>
  )
}

function paletteToColors(): SceneColors {
  const p = readPalette()
  return {
    ink: new THREE.Color(p.ink),
    verified: new THREE.Color(p.verified),
    scan: new THREE.Color(p.scan),
  }
}

export default function BlueprintScene({
  className,
  theme,
}: {
  className?: string
  theme: 'light' | 'dark'
}) {
  const [colors, setColors] = useState<SceneColors>(() => paletteToColors())
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    setColors(paletteToColors())
    setReduceMotion(
      typeof window !== 'undefined' &&
        (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
    )
  }, [theme])

  return (
    <div className={className}>
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        camera={{ position: [0, 0, 10.6], fov: 36 }}
        frameloop={reduceMotion ? 'demand' : 'always'}
      >
        <Scene colors={colors} reduceMotion={reduceMotion} />
        <FrameGovernor reduceMotion={reduceMotion} />
      </Canvas>
    </div>
  )
}
