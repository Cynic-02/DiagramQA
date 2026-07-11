'use client'

import { Canvas } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

/**
 * GraphBackground3D — ambient particle-depth background used on non-hero
 * pages (login, forgot-password, agents console, etc.) so the whole site
 * shares one consistent 3D language. Same visual concept as the hero's
 * ParticleFieldScene (layered drifting motes, no nodes or connecting
 * lines) — kept as a separate, lighter component since these pages don't
 * need scroll-driven camera movement, just calm ambient depth.
 */
export function GraphBackground3D({
  className,
  density = 'normal',
}: {
  className?: string
  density?: 'low' | 'normal' | 'high'
}) {
  const multiplier = density === 'low' ? 0.5 : density === 'high' ? 1.6 : 1

  return (
    <div className={className} aria-hidden>
      <Canvas
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        camera={{ position: [0, 0, 10], fov: 50 }}
        style={{ width: '100%', height: '100%' }}
      >
        <ambientLight intensity={0.25} />
        <hemisphereLight args={['#fbbf24', '#1a1410', 0.3]} />
        <AmbientParticles multiplier={multiplier} />
      </Canvas>
    </div>
  )
}

const COLORS = ['#fbbf24', '#f43f5e', '#fb923c', '#f59e0b', '#fef3c7']

function rand(seed: number) {
  const x = Math.sin(seed) * 43758.5453
  return x - Math.floor(x)
}

/** Two soft depth layers of drifting points — same language as the hero. */
function AmbientParticles({ multiplier }: { multiplier: number }) {
  return (
    <>
      <Layer count={Math.round(90 * multiplier)} radius={16} sizeMin={0.4} sizeMax={1.0} speed={0.02} seed={0} opacity={0.4} />
      <Layer count={Math.round(28 * multiplier)} radius={8} sizeMin={1.0} sizeMax={2.2} speed={0.035} seed={500} opacity={0.5} />
    </>
  )
}

function Layer({
  count,
  radius,
  sizeMin,
  sizeMax,
  speed,
  seed,
  opacity,
}: {
  count: number
  radius: number
  sizeMin: number
  sizeMax: number
  speed: number
  seed: number
  opacity: number
}) {
  const ref = useRef<THREE.Points>(null)

  const { positions, colors, base } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const base = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const palette = COLORS.map((c) => new THREE.Color(c))
    for (let i = 0; i < count; i++) {
      const s = seed + i * 3.3
      const r = rand(s * 1.1) * radius
      const theta = rand(s * 2.2) * Math.PI * 2
      const phi = Math.acos(2 * rand(s * 3.3) - 1)
      const x = r * Math.sin(phi) * Math.cos(theta)
      const y = r * Math.sin(phi) * Math.sin(theta) * 0.6
      const z = r * Math.cos(phi) - 4
      positions[i * 3] = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z
      base[i * 3] = x
      base[i * 3 + 1] = y
      base[i * 3 + 2] = z
      const c = palette[Math.floor(rand(s * 4.4) * palette.length)]
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }
    return { positions, colors, base }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, radius, seed])

  const sizeAvg = (sizeMin + sizeMax) / 2

  // Static field — no per-frame drift/rotation, per design direction.

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={count} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} count={count} />
      </bufferGeometry>
      <pointsMaterial
        size={sizeAvg * 0.06}
        sizeAttenuation
        vertexColors
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
