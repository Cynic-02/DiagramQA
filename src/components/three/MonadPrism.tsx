'use client'

import { useMemo, useRef, type MutableRefObject, type ElementRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Lightformer, MeshTransmissionMaterial } from '@react-three/drei'
import * as THREE from 'three'

/* ============================================================
   MonadPrism — light-mode ("Monad") counterpart to ChromaticPrism.
   Same floating-glass-block mechanic and shimmer easing, but tuned to
   Monad's own palette (Lake Blue / Coral / Sky / Mint) instead of the
   dark prism's saturated red/cyan/lime — so the hero's glass blocks
   read as "the same brand's light mode," not an unrelated visual.
   Rendered against Monad's warm parchment canvas, not a dark void.
   ============================================================ */

const LAKE_BLUE = '#2b59d1'
const CORAL = '#ff9473'
const MINT = '#a7fccd'
const PARCHMENT_WHITE = '#fffaf3'

const SHIMMER_PERIOD = 6.65

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

const BLOCKS: BlockDef[] = [
  { position: [-1.1, 0.35, 0.3], scale: 0.62, rotationSpeed: 0.12, floatSpeed: 0.6, floatOffset: 0, thickness: 0.85, chromaticAberration: 0.4 },
  { position: [1.05, -0.3, -0.2], scale: 0.5, rotationSpeed: -0.09, floatSpeed: 0.5, floatOffset: 1.4, thickness: 0.7, chromaticAberration: 0.32 },
  { position: [0.05, 0.8, -0.9], scale: 0.42, rotationSpeed: 0.16, floatSpeed: 0.7, floatOffset: 2.6, thickness: 0.6, chromaticAberration: 0.5 },
  { position: [-0.45, -0.85, -0.15], scale: 0.55, rotationSpeed: -0.11, floatSpeed: 0.45, floatOffset: 3.8, thickness: 0.75, chromaticAberration: 0.38 },
  { position: [1.35, 0.7, -1.1], scale: 0.35, rotationSpeed: 0.2, floatSpeed: 0.8, floatOffset: 0.9, thickness: 0.55, chromaticAberration: 0.55 },
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
        roughness={0.08}
        ior={1.2}
        chromaticAberration={def.chromaticAberration}
        anisotropy={0.1}
        distortion={0.08}
        distortionScale={0.2}
        temporalDistortion={0.1}
        samples={10}
        resolution={256}
        color={PARCHMENT_WHITE}
        attenuationColor={PARCHMENT_WHITE}
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
  const blueRef = useRef<THREE.PointLight>(null)
  const coralRef = useRef<THREE.PointLight>(null)
  const mintRef = useRef<THREE.PointLight>(null)

  useFrame((state) => {
    shimmerRef.current = shimmerPhase(state.clock.elapsedTime)
    const boost = 8 + shimmerRef.current * 5
    if (blueRef.current) blueRef.current.intensity = boost
    if (coralRef.current) coralRef.current.intensity = boost
    if (mintRef.current) mintRef.current.intensity = boost + 1
  })

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[2, 3, 4]} intensity={0.5} color={PARCHMENT_WHITE} />

      <pointLight ref={blueRef} position={[-2.2, 1, 1.6]} intensity={9} color={LAKE_BLUE} distance={9} decay={2} />
      <pointLight ref={coralRef} position={[2.2, -0.6, 1.2]} intensity={9} color={CORAL} distance={9} decay={2} />
      <pointLight ref={mintRef} position={[0, 1.6, -1.2]} intensity={10} color={MINT} distance={9} decay={2} />

      <Environment resolution={256}>
        <Lightformer form="rect" color={LAKE_BLUE} intensity={4} position={[-4, 2, 2]} scale={[4, 3, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" color={CORAL} intensity={4} position={[4, -1.5, 2]} scale={[4, 3, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" color={MINT} intensity={4} position={[0, 3, -2]} scale={[4, 3, 1]} target={[0, 0, 0]} />
        <Lightformer form="ring" color={PARCHMENT_WHITE} intensity={3} position={[0, 0, 4]} scale={3} target={[0, 0, 0]} />
      </Environment>
    </>
  )
}

export default function MonadPrism({ className }: { className?: string }) {
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
