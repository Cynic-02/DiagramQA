'use client'

import { useRef, useMemo } from 'react'
import { useTheme } from 'next-themes'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { MotionValue } from 'framer-motion'

/* ============================================================
   AR2-DDCQG HERO BACKGROUND — layered particle depth field.
   Replaces the earlier node-graph concept entirely. No discrete
   nodes, no connecting lines, no labels — just soft floating
   motes arranged in several depth layers so mouse movement and
   scroll produce a calm, believable parallax. Moderate density:
   present and alive, but clearly secondary to the hero text.
   ============================================================ */

interface Palette {
  domeColor: string
  fogColor: string
  fogNear: number
  fogFar: number
  ambientIntensity: number
  hemiSky: string
  hemiGround: string
  hemiIntensity: number
  layerColors: string[]
  particleOpacity: number
  glowOpacity: number
}

const DARK_PALETTE: Palette = {
  domeColor: '#0c0a08',
  fogColor: '#181210',
  fogNear: 10,
  fogFar: 38,
  ambientIntensity: 0.25,
  hemiSky: '#fbbf24',
  hemiGround: '#1a1410',
  hemiIntensity: 0.3,
  layerColors: ['#fef3c7', '#fbbf24', '#f97362', '#f59e0b'],
  particleOpacity: 0.65,
  glowOpacity: 0.5,
}

const LIGHT_PALETTE: Palette = {
  domeColor: '#f6f1e6',
  fogColor: '#ede6d6',
  fogNear: 12,
  fogFar: 42,
  ambientIntensity: 0.75,
  hemiSky: '#fff7ec',
  hemiGround: '#ddd0b5',
  hemiIntensity: 0.5,
  layerColors: ['#92400e', '#b45309', '#c2410c', '#9a3412'],
  particleOpacity: 0.38,
  glowOpacity: 0.3,
}

interface SceneProps {
  scrollY: MotionValue<number>
  reduced: boolean
}

export function ParticleFieldScene({ scrollY, reduced }: SceneProps) {
  const { resolvedTheme } = useTheme()
  const palette = resolvedTheme === 'light' ? LIGHT_PALETTE : DARK_PALETTE

  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 0, 12], fov: 50 }}
      style={{ width: '100%', height: '100%' }}
    >
      <fog attach="fog" args={[palette.fogColor, palette.fogNear, palette.fogFar]} />
      <SceneContents scrollY={scrollY} reduced={reduced} palette={palette} />
    </Canvas>
  )
}

function SceneContents({
  scrollY,
  reduced,
  palette,
}: SceneProps & { palette: Palette }) {
  const groupRef = useRef<THREE.Group>(null)
  const clockRef = useRef(0)

  useFrame((state) => {
    const dt = state.clock.getDelta()
    clockRef.current += dt
    const t = clockRef.current

    // Gentle intro drift-in, then settle. Camera eases forward slightly
    // on load and drifts back out on scroll for a calm parallax feel.
    const introT = Math.min(1, t / 2.2)
    const introEase = 1 - Math.pow(1 - introT, 4)
    const baseZ = 15 - introEase * 3
    const scrollZ = baseZ - scrollY.get() * 5

    const px = state.pointer.x
    const py = state.pointer.y
    const handheld = reduced ? 0 : 0.08

    state.camera.position.x = THREE.MathUtils.lerp(
      state.camera.position.x,
      px * 0.6 + Math.sin(t * 0.35) * handheld,
      0.035
    )
    state.camera.position.y = THREE.MathUtils.lerp(
      state.camera.position.y,
      py * 0.4 - scrollY.get() * 1.2 + Math.cos(t * 0.3) * handheld,
      0.035
    )
    state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, scrollZ, 0.045)
    state.camera.lookAt(0, -scrollY.get() * 0.3, 0)
  })

  return (
    <>
      <ambientLight intensity={palette.ambientIntensity} />
      <hemisphereLight args={[palette.hemiSky, palette.hemiGround, palette.hemiIntensity]} />

      {/* Enclosing dome so the fog reads as atmosphere, not empty space */}
      <mesh scale={60}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial side={THREE.BackSide} color={palette.domeColor} />
      </mesh>

      <group ref={groupRef}>
        {/* Three depth layers: far (small, dense, slow), mid, near (few, large, faster parallax) */}
        <ParticleLayer
          count={420}
          radiusMin={14}
          radiusMax={26}
          sizeMin={0.4}
          sizeMax={1.1}
          driftSpeed={0.015}
          palette={palette}
          reduced={reduced}
          seedOffset={0}
        />
        <ParticleLayer
          count={180}
          radiusMin={8}
          radiusMax={16}
          sizeMin={0.9}
          sizeMax={2.0}
          driftSpeed={0.03}
          palette={palette}
          reduced={reduced}
          seedOffset={1000}
        />
        <ParticleLayer
          count={55}
          radiusMin={3}
          radiusMax={9}
          sizeMin={1.8}
          sizeMax={3.6}
          driftSpeed={0.05}
          palette={palette}
          reduced={reduced}
          seedOffset={2000}
        />
      </group>
    </>
  )
}

/**
 * A single depth layer of soft circular points, gently drifting.
 * Deterministic per-layer seed so positions are stable across renders
 * (no reshuffling on re-render/theme toggle).
 */
function ParticleLayer({
  count,
  radiusMin,
  radiusMax,
  sizeMin,
  sizeMax,
  driftSpeed,
  palette,
  reduced,
  seedOffset,
}: {
  count: number
  radiusMin: number
  radiusMax: number
  sizeMin: number
  sizeMax: number
  driftSpeed: number
  palette: Palette
  reduced: boolean
  seedOffset: number
}) {
  const ref = useRef<THREE.Points>(null)

  // Simple deterministic PRNG so layers don't reshuffle across re-renders.
  function rand(seed: number) {
    const x = Math.sin(seed) * 43758.5453
    return x - Math.floor(x)
  }

  const { positions, colors, sizes, basePositions } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const basePositions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const palColors = palette.layerColors.map((c) => new THREE.Color(c))

    for (let i = 0; i < count; i++) {
      const s = seedOffset + i
      const r = radiusMin + rand(s * 1.7) * (radiusMax - radiusMin)
      const theta = rand(s * 2.3) * Math.PI * 2
      const phi = Math.acos(2 * rand(s * 3.1) - 1)
      const x = r * Math.sin(phi) * Math.cos(theta)
      const y = r * Math.sin(phi) * Math.sin(theta) * 0.6 // flatten vertically a touch
      const z = r * Math.cos(phi) - 6 // bias field slightly behind camera start
      positions[i * 3] = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z
      basePositions[i * 3] = x
      basePositions[i * 3 + 1] = y
      basePositions[i * 3 + 2] = z

      const c = palColors[Math.floor(rand(s * 4.7) * palColors.length)]
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b

      sizes[i] = sizeMin + rand(s * 5.9) * (sizeMax - sizeMin)
    }
    return { positions, colors, sizes, basePositions }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, radiusMin, radiusMax, sizeMin, sizeMax, seedOffset, palette.layerColors.join(',')])

  // Static field — positions are set once from basePositions and never
  // animated per-frame (no drift/bob/rotation), per design direction.

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={count} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} count={count} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} count={count} />
      </bufferGeometry>
      <pointsMaterial
        size={0.09}
        sizeAttenuation
        vertexColors
        transparent
        opacity={palette.particleOpacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
