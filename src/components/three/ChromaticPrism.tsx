'use client'

import { useMemo, useRef, type MutableRefObject, type ElementRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Lightformer, MeshTransmissionMaterial } from '@react-three/drei'
import * as THREE from 'three'

/* ============================================================
   ChromaticPrism — "prismatic light through obsidian" hero
   background.

   REBUILT after two visual bugs I couldn't catch without a working
   browser connection:
     1. A pure-black material `color` crushed transmission to black
        (fixed last round).
     2. A per-cube `background` prop (which force-swaps the WHOLE
        scene's background during that cube's own capture pass — see
        node_modules/@react-three/drei/core/MeshTransmissionMaterial.js)
        produced flat, opaque-looking color instead of real glass, and
        the cubes were scaled too large relative to the camera framing,
        causing overlap that read as "only four boxes".

   Fix this round: removed the background hack. MeshTransmissionMaterial
   needs something to actually reflect/refract to look like glass at
   all — that's provided here by a LOCAL, procedural environment (drei's
   <Environment> + <Lightformer>, confirmed by reading Environment.js:
   passing only `children`, no `preset`/`files`, routes to EnvironmentPortal,
   which captures a virtual scene into a local cube render target —
   zero network fetch, not an HDRI download). Three colored Lightformer
   panels (the exact prism hues) plus the point lights are what the
   glass now actually reflects and refracts. Cube scale is also cut
   roughly in half and the camera pulled back slightly so all five
   stay visually distinct.

   Exact tokens used (from the supplied style reference):
     --color-prism-red:   #ff2a2a
     --color-prism-cyan:  #2a7fff
     --color-prism-lime:  #2aff2a
     --color-bone-white:  #fffdf9

   Motion: the doc's signature curve cubic-bezier(0.52, 0.01, 0, 1)
   (slow start, decisive stop) drives a ~6.65s looped shimmer in
   chromaticAberration + light intensity — see vividEase()/shimmerPhase()
   below, a direct port of that curve rather than a generic easing preset.

   No shadows are enabled anywhere in this scene, per the reference's
   "zero shadows" rule.
   ============================================================ */

const PRISM_RED = '#ff2a2a'
const PRISM_CYAN = '#2a7fff'
const PRISM_LIME = '#2aff2a'
const BONE_WHITE = '#fffdf9'

const SHIMMER_PERIOD = 6.65 // seconds — matches the doc's named animation duration

/** Cubic-bezier(0.52, 0.01, 0, 1) evaluated at parametric t via De Casteljau
 *  subdivision, then re-expressed as a function of x (time progress) by
 *  bisection — a direct port of the reference's signature easing curve. */
function vividEase(x: number): number {
  const p1x = 0.52, p1y = 0.01, p2x = 0, p2y = 1
  const bx = (t: number) => 3 * (1 - t) ** 2 * t * p1x + 3 * (1 - t) * t ** 2 * p2x + t ** 3
  const by = (t: number) => 3 * (1 - t) ** 2 * t * p1y + 3 * (1 - t) * t ** 2 * p2y + t ** 3
  let lo = 0, hi = 1, t = x
  for (let i = 0; i < 8; i++) {
    t = (lo + hi) / 2
    if (bx(t) < x) lo = t
    else hi = t
  }
  return by(t)
}

/** A 0..1 loop through vividEase, so the shimmer builds slowly and snaps
 *  decisively rather than oscillating smoothly like a sine wave. */
function shimmerPhase(elapsedSeconds: number): number {
  const t = (elapsedSeconds % SHIMMER_PERIOD) / SHIMMER_PERIOD
  const triangular = t < 0.5 ? t * 2 : 2 - t * 2
  return vividEase(triangular)
}

interface BlockDef {
  position: [number, number, number]
  scale: number
  rotationSpeed: number
  floatSpeed: number
  floatOffset: number
  thickness: number
  chromaticAberration: number
}

// Five cubes (within the doc's "four to six"), noticeably smaller and
// tighter than the previous attempt so they stay visually distinct
// instead of overlapping into an indistinguishable mass.
const BLOCKS: BlockDef[] = [
  { position: [-1.1, 0.35, 0.3], scale: 0.62, rotationSpeed: 0.12, floatSpeed: 0.6, floatOffset: 0, thickness: 0.85, chromaticAberration: 0.8 },
  { position: [1.05, -0.3, -0.2], scale: 0.5, rotationSpeed: -0.09, floatSpeed: 0.5, floatOffset: 1.4, thickness: 0.7, chromaticAberration: 0.65 },
  { position: [0.05, 0.8, -0.9], scale: 0.42, rotationSpeed: 0.16, floatSpeed: 0.7, floatOffset: 2.6, thickness: 0.6, chromaticAberration: 1.0 },
  { position: [-0.45, -0.85, -0.15], scale: 0.55, rotationSpeed: -0.11, floatSpeed: 0.45, floatOffset: 3.8, thickness: 0.75, chromaticAberration: 0.75 },
  { position: [1.35, 0.7, -1.1], scale: 0.35, rotationSpeed: 0.2, floatSpeed: 0.8, floatOffset: 0.9, thickness: 0.55, chromaticAberration: 1.1 },
]

function GlassBlock({ def, shimmerRef }: { def: BlockDef; shimmerRef: MutableRefObject<number> }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<ElementRef<typeof MeshTransmissionMaterial>>(null)

  useFrame((state) => {
    const mesh = meshRef.current
    if (mesh) {
      mesh.rotation.x += def.rotationSpeed * 0.01
      mesh.rotation.y += def.rotationSpeed * 0.014
      mesh.position.y = def.position[1] + Math.sin(state.clock.elapsedTime * def.floatSpeed + def.floatOffset) * 0.12
    }
    const mat = materialRef.current as any
    if (mat) {
      mat.chromaticAberration = def.chromaticAberration * (0.6 + 0.6 * shimmerRef.current)
    }
  })

  return (
    <mesh ref={meshRef} position={def.position} scale={def.scale}>
      <boxGeometry args={[1, 1, 1]} />
      <MeshTransmissionMaterial
        ref={materialRef}
        transmission={1}
        thickness={def.thickness}
        roughness={0.05}
        ior={1.2}
        chromaticAberration={def.chromaticAberration}
        anisotropy={0.1}
        distortion={0.1}
        distortionScale={0.2}
        temporalDistortion={0.1}
        samples={10}
        resolution={256}
        color={BONE_WHITE}
        attenuationColor={BONE_WHITE}
      />
    </mesh>
  )
}

function PrismGroup({ shimmerRef }: { shimmerRef: MutableRefObject<number> }) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.06
  })

  return (
    <group ref={groupRef}>
      {BLOCKS.map((def, i) => (
        <GlassBlock key={i} def={def} shimmerRef={shimmerRef} />
      ))}
    </group>
  )
}

function PrismLights({ shimmerRef }: { shimmerRef: MutableRefObject<number> }) {
  const redRef = useRef<THREE.PointLight>(null)
  const cyanRef = useRef<THREE.PointLight>(null)
  const limeRef = useRef<THREE.PointLight>(null)

  useFrame((state) => {
    shimmerRef.current = shimmerPhase(state.clock.elapsedTime)
    const boost = 12 + shimmerRef.current * 8
    if (redRef.current) redRef.current.intensity = boost
    if (cyanRef.current) cyanRef.current.intensity = boost
    if (limeRef.current) limeRef.current.intensity = boost + 2
  })

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[2, 3, 4]} intensity={0.3} color={BONE_WHITE} />

      {/* Direct specular hits \u2014 the visible glinting points on the glass. */}
      <pointLight ref={redRef} position={[-2.2, 1, 1.6]} intensity={14} color={PRISM_RED} distance={9} decay={2} />
      <pointLight ref={cyanRef} position={[2.2, -0.6, 1.2]} intensity={14} color={PRISM_CYAN} distance={9} decay={2} />
      <pointLight ref={limeRef} position={[0, 1.6, -1.2]} intensity={16} color={PRISM_LIME} distance={9} decay={2} />

      {/* Local, procedural environment (no HDRI network fetch \u2014 see
          Environment.js dispatch: children-only routes to EnvironmentPortal,
          which captures a virtual scene into a local cube render target).
          This is what the glass actually reflects/refracts \u2014 without any
          environment content, MeshTransmissionMaterial has nothing to bend
          and reads as flat/opaque no matter how the other props are tuned. */}
      <Environment resolution={256}>
        <Lightformer form="rect" color={PRISM_RED} intensity={6} position={[-4, 2, 2]} scale={[4, 3, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" color={PRISM_CYAN} intensity={6} position={[4, -1.5, 2]} scale={[4, 3, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" color={PRISM_LIME} intensity={6} position={[0, 3, -2]} scale={[4, 3, 1]} target={[0, 0, 0]} />
        <Lightformer form="ring" color={BONE_WHITE} intensity={2} position={[0, 0, 4]} scale={3} target={[0, 0, 0]} />
      </Environment>
    </>
  )
}

export default function ChromaticPrism({ className }: { className?: string }) {
  const dpr = useMemo<[number, number]>(() => [1, 2], [])
  const shimmerRef = useRef(0)

  return (
    <div className={className} style={{ width: '100%', height: '100%' }}>
      <Canvas
        dpr={dpr}
        gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }}
        camera={{ position: [0, 0, 5], fov: 45 }}
      >
        <PrismLights shimmerRef={shimmerRef} />
        <PrismGroup shimmerRef={shimmerRef} />
      </Canvas>
    </div>
  )
}
