'use client'

import { useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

/* ============================================================
   ParticleMorphScene — real 3D instanced particles (small faceted
   tetrahedra, not flat camera-facing sprites) that reshape into
   recognizable glyphs as the page scrolls, the way the Dala
   reference does. Replaces SiteConstellation (OGL point sprites)
   entirely — that version read as flat 2D "glitter" with no real
   depth, light, or glow; this one has actual per-instance 3D
   volume, catches real point lights (same technique proven in
   LivingGraphScene), and gets a genuine additive glow shell rather
   than a texture trick.

   Shapes are specific to this project, not a generic brand gesture:
     - "logo"      — the actual /logo-mark.png silhouette, traced
                      from the image's alpha channel, given real
                      depth via per-particle z-jitter.
     - "network"   — a hub-and-spoke knowledge-graph glyph, standing
                      in for "diagram -> extracted graph" (Features).
     - "checkmark" — "verified question set" (the CTA).
     - "scatter"   — full 3D volumetric dispersion between shapes.

   Colors are read live from the active theme's CSS custom
   properties, same as before — never a hardcoded hex list.
   ============================================================ */

function readPalette(): string[] {
  if (typeof document === 'undefined') return ['#3ba4c7', '#e8876f', '#f0b84a', '#5bb896', '#5bbde0']
  const style = getComputedStyle(document.documentElement)
  const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback
  return [
    read('--primary', '#3ba4c7'),
    read('--accent', '#f0b84a'),
    read('--diagram-sky', '#5bbde0'),
    read('--diagram-mint', '#5bb896'),
    read('--diagram-coral', '#e8876f'),
  ]
}

function rand(seed: number) {
  const x = Math.sin(seed) * 43758.5453
  return x - Math.floor(x)
}

function smoothstep(x: number) {
  const t = Math.max(0, Math.min(1, x))
  return t * t * (3 - 2 * t)
}
/* ---- Shape generators — each returns count*3 floats (x,y,z), with a
   real z-jitter for volume so glyphs read as thin 3D slabs, not flat
   planes facing the camera. ---- */

function sampleUnitBall(seed: number): [number, number, number] {
  const theta = rand(seed * 1.7) * Math.PI * 2
  const phi = Math.acos(2 * rand(seed * 2.3) - 1)
  const r = Math.cbrt(rand(seed * 3.1))
  return [r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi)]
}

function makeScatterPositions(count: number): Float32Array {
  const arr = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const [x, y, z] = sampleUnitBall(i + 1)
    arr.set([x * 3.4, y * 2.6, z * 3.4], i * 3)
  }
  return arr
}

/** Two-segment checkmark, given real thickness via z-jitter. */
function makeCheckmarkPositions(count: number): Float32Array {
  const arr = new Float32Array(count * 3)
  const p0 = [-0.62, 0.06]
  const p1 = [-0.15, -0.48]
  const p2 = [0.68, 0.52]
  const len1 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1])
  const len2 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1])
  const total = len1 + len2
  for (let i = 0; i < count; i++) {
    const s = i + 1
    const t = rand(s * 1.3) * total
    let x: number, y: number
    if (t < len1) {
      const lt = t / len1
      x = p0[0] + (p1[0] - p0[0]) * lt
      y = p0[1] + (p1[1] - p0[1]) * lt
    } else {
      const lt = (t - len1) / len2
      x = p1[0] + (p2[0] - p1[0]) * lt
      y = p1[1] + (p2[1] - p1[1]) * lt
    }
    x += (rand(s * 2.9) - 0.5) * 0.09
    y += (rand(s * 3.7) - 0.5) * 0.09
    const z = (rand(s * 4.1) - 0.5) * 0.5
    arr.set([x, y, z], i * 3)
  }
  return arr
}
/** Hub-and-spoke knowledge-graph glyph — center node radiating to five
 *  satellites, standing in for "the diagram resolved into a graph". */
function makeNetworkPositions(count: number): Float32Array {
  const arr = new Float32Array(count * 3)
  const hub: [number, number] = [0, 0]
  const satellites: [number, number][] = [
    [-0.65, 0.4], [0.18, 0.68], [0.68, 0.1], [0.32, -0.6], [-0.48, -0.46],
  ]
  const allNodes = [hub, ...satellites]
  const nodeShare = Math.floor(count * 0.5)
  for (let i = 0; i < count; i++) {
    const s = i + 1
    if (i < nodeShare) {
      const [nx, ny] = allNodes[i % allNodes.length]
      const angle = rand(s * 1.9) * Math.PI * 2
      const r = rand(s * 2.7) * 0.09
      const x = nx + Math.cos(angle) * r
      const y = ny + Math.sin(angle) * r
      const z = (rand(s * 3.3) - 0.5) * 0.45
      arr.set([x, y, z], i * 3)
    } else {
      const [sx, sy] = satellites[i % satellites.length]
      const t = rand(s * 4.1)
      const x = hub[0] + (sx - hub[0]) * t + (rand(s * 5.3) - 0.5) * 0.04
      const y = hub[1] + (sy - hub[1]) * t + (rand(s * 6.1) - 0.5) * 0.04
      const z = (rand(s * 7.3) - 0.5) * 0.4
      arr.set([x, y, z], i * 3)
    }
  }
  return arr
}
/** Traces /logo-mark.png's alpha silhouette, giving each sampled point
 *  real depth via z-jitter so the mark reads as a thin volumetric
 *  slab rather than a flat decal. */
function sampleLogoPositions(count: number): Promise<Float32Array> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(makeScatterPositions(count))
      return
    }
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const size = 160
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('no 2d context')
        const scale = Math.min(size / img.width, size / img.height)
        const dw = img.width * scale
        const dh = img.height * scale
        ctx.clearRect(0, 0, size, size)
        ctx.drawImage(img, (size - dw) / 2, (size - dh) / 2, dw, dh)
        const data = ctx.getImageData(0, 0, size, size).data

        const candidates: [number, number][] = []
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const alpha = data[(y * size + x) * 4 + 3]
            if (alpha > 120) candidates.push([x, y])
          }
        }
        if (candidates.length === 0) throw new Error('empty alpha mask')

        const arr = new Float32Array(count * 3)
        for (let i = 0; i < count; i++) {
          const idx = Math.floor(rand((i + 1) * 8.9) * candidates.length)
          const [px, py] = candidates[idx]
          const nx = (px / size - 0.5) * 2
          const ny = -(py / size - 0.5) * 2
          const nz = (rand((i + 1) * 9.7) - 0.5) * 0.4
          arr.set([nx * 1.6, ny * 1.6, nz], i * 3)
        }
        resolve(arr)
      } catch {
        resolve(makeScatterPositions(count))
      }
    }
    img.onerror = () => resolve(makeScatterPositions(count))
    img.src = '/logo-mark.png'
  })
}

type ShapeName = 'logo' | 'network' | 'checkmark' | 'scatter'

/** Scroll-progress checkpoints (0..1 across total page height) — a
 *  loose narrative of the product's own pipeline. */
const KEYFRAMES: { at: number; shape: ShapeName }[] = [
  { at: 0.0, shape: 'logo' },
  { at: 0.16, shape: 'scatter' },
  { at: 0.38, shape: 'network' },
  { at: 0.6, shape: 'scatter' },
  { at: 0.78, shape: 'checkmark' },
  { at: 0.92, shape: 'scatter' },
  { at: 1.0, shape: 'logo' },
]

interface Seed {
  colorIdx: number
  size: number
  rotX: number
  rotY: number
  phase: number
}

function buildSeeds(count: number, colorCount: number): Seed[] {
  const out: Seed[] = []
  for (let i = 0; i < count; i++) {
    const s = i + 1
    out.push({
      colorIdx: Math.floor(rand(s * 11.3) * colorCount),
      size: 0.05 + rand(s * 13.1) * 0.055,
      rotX: 0.15 + rand(s * 17.7) * 0.5,
      rotY: 0.15 + rand(s * 19.3) * 0.5,
      phase: rand(s * 23.1) * Math.PI * 2,
    })
  }
  return out
}
/** The morphing cluster: real InstancedMesh tetrahedra with a lit
 *  physical-material core (catches the scene's point lights, giving
 *  actual per-face shading and depth) plus a larger, additive,
 *  transparent glow-shell instance layer behind it — the same
 *  glow technique already proven in LivingGraphScene, applied here
 *  instead of a flat sprite texture trick. */
function MorphingParticles({
  count,
  colors,
  scrollRef,
}: {
  count: number
  colors: THREE.Color[]
  scrollRef: React.RefObject<number>
}) {
  const coreRef = useRef<THREE.InstancedMesh>(null)
  const glowRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const seeds = useMemo(() => buildSeeds(count, colors.length), [count, colors.length])
  const shapeCache = useRef<Partial<Record<ShapeName, Float32Array>>>({})
  const blended = useMemo(() => new Float32Array(count * 3), [count])

  useEffect(() => {
    shapeCache.current.scatter = makeScatterPositions(count)
    shapeCache.current.checkmark = makeCheckmarkPositions(count)
    shapeCache.current.network = makeNetworkPositions(count)
    let cancelled = false
    sampleLogoPositions(count).then((arr) => {
      if (!cancelled) shapeCache.current.logo = arr
    })
    return () => {
      cancelled = true
    }
  }, [count])

  useEffect(() => {
    const core = coreRef.current
    const glow = glowRef.current
    if (!core || !glow) return
    seeds.forEach((seed, i) => {
      const c = colors[seed.colorIdx]
      core.setColorAt(i, c)
      glow.setColorAt(i, c)
    })
    if (core.instanceColor) core.instanceColor.needsUpdate = true
    if (glow.instanceColor) glow.instanceColor.needsUpdate = true
  }, [seeds, colors])
  useFrame((state) => {
    const core = coreRef.current
    const glow = glowRef.current
    if (!core || !glow) return

    const p = scrollRef.current ?? 0
    let a = KEYFRAMES[0]
    let b = KEYFRAMES[KEYFRAMES.length - 1]
    for (let i = 0; i < KEYFRAMES.length - 1; i++) {
      if (p >= KEYFRAMES[i].at && p <= KEYFRAMES[i + 1].at) {
        a = KEYFRAMES[i]
        b = KEYFRAMES[i + 1]
        break
      }
    }
    const span = b.at - a.at
    const rawT = span > 0 ? (p - a.at) / span : 0
    const localT = smoothstep(rawT)
    const arrA = shapeCache.current[a.shape] ?? shapeCache.current.scatter
    const arrB = shapeCache.current[b.shape] ?? shapeCache.current.scatter
    if (!arrA || !arrB) return

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      blended[i3] = arrA[i3] + (arrB[i3] - arrA[i3]) * localT
      blended[i3 + 1] = arrA[i3 + 1] + (arrB[i3 + 1] - arrA[i3 + 1]) * localT
      blended[i3 + 2] = arrA[i3 + 2] + (arrB[i3 + 2] - arrA[i3 + 2]) * localT
    }

    const t = state.clock.elapsedTime
    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      const seed = seeds[i]
      dummy.position.set(blended[i3], blended[i3 + 1], blended[i3 + 2])
      dummy.rotation.set(t * seed.rotX + seed.phase, t * seed.rotY + seed.phase * 1.4, 0)
      dummy.scale.setScalar(seed.size)
      dummy.updateMatrix()
      core.setMatrixAt(i, dummy.matrix)

      dummy.scale.setScalar(seed.size * 2.4)
      dummy.updateMatrix()
      glow.setMatrixAt(i, dummy.matrix)
    }
    core.instanceMatrix.needsUpdate = true
    glow.instanceMatrix.needsUpdate = true
  })

  return (
    <>
      <instancedMesh ref={glowRef} args={[undefined, undefined, count]}>
        <tetrahedronGeometry args={[1, 0]} />
        <meshBasicMaterial
          transparent
          opacity={0.1}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </instancedMesh>
      <instancedMesh ref={coreRef} args={[undefined, undefined, count]}>
        <tetrahedronGeometry args={[1, 0]} />
        <meshPhysicalMaterial
          roughness={0.28}
          metalness={0.15}
          emissiveIntensity={0.55}
          emissive={new THREE.Color('#ffffff')}
          toneMapped={false}
        />
      </instancedMesh>
    </>
  )
}
/** Sparse, wide, never-morphing ambient layer — the floating confetti
 *  of small shapes scattered across the whole viewport in the
 *  reference, giving atmosphere independent of the main morphing
 *  cluster. Positions are set once; only rotation drifts per frame. */
function AmbientParticles({ count, colors }: { count: number; colors: THREE.Color[] }) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const seeds = useMemo(() => buildSeeds(count, colors.length), [count, colors.length])
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const s = i + 1
      const x = (rand(s * 31.1) - 0.5) * 14
      const y = (rand(s * 37.7) - 0.5) * 9
      const z = (rand(s * 41.3) - 0.5) * 6 - 2
      arr.set([x, y, z], i * 3)
    }
    return arr
  }, [count])

  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    seeds.forEach((seed, i) => mesh.setColorAt(i, colors[seed.colorIdx]))
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [seeds, colors])

  useFrame((state) => {
    const mesh = meshRef.current
    if (!mesh) return
    const t = state.clock.elapsedTime
    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      const seed = seeds[i]
      dummy.position.set(positions[i3], positions[i3 + 1], positions[i3 + 2])
      dummy.rotation.set(t * seed.rotX * 0.4 + seed.phase, t * seed.rotY * 0.4, 0)
      dummy.scale.setScalar(seed.size * 0.8)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <tetrahedronGeometry args={[1, 0]} />
      <meshBasicMaterial transparent opacity={0.22} depthWrite={false} toneMapped={false} />
    </instancedMesh>
  )
}
/** Scene wrapper: lights, live scroll progress, gentle continuous
 *  rotation, and cursor parallax on the whole group. */
function Scene({ palette }: { palette: string[] }) {
  const colors = useMemo(() => palette.map((hex) => new THREE.Color(hex)), [palette])
  const groupRef = useRef<THREE.Group>(null)
  const scrollRef = useRef(0)

  useFrame((state) => {
    if (typeof window !== 'undefined') {
      const max = document.documentElement.scrollHeight - window.innerHeight
      scrollRef.current = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
    }
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.02 + state.pointer.x * 0.15
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.06) * 0.05 - state.pointer.y * 0.1
    }
  })

  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.35} />
      <pointLight position={[4, 3, 5]} intensity={16} color={palette[0]} distance={16} decay={2} />
      <pointLight position={[-4, -2, 4]} intensity={12} color={palette[1]} distance={16} decay={2} />
      <pointLight position={[0, 4, -2]} intensity={9} color={palette[2]} distance={18} decay={2} />

      <AmbientParticles count={140} colors={colors} />
      <MorphingParticles count={1100} colors={colors} scrollRef={scrollRef} />
    </group>
  )
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

export default function ParticleMorphScene({ className }: { className?: string }) {
  const [palette, setPalette] = useState<string[]>(() => readPalette())
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    setPalette(readPalette())
    setReduceMotion(
      typeof window !== 'undefined' &&
        (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
    )
    // Re-read colors whenever the active theme/palette attribute changes,
    // since next-themes/PaletteProvider mutate <html> attributes directly
    // rather than remounting this component.
    const observer = new MutationObserver(() => setPalette(readPalette()))
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'data-palette'],
    })
    return () => observer.disconnect()
  }, [])

  return (
    <div className={className} style={{ width: '100%', height: '100%' }}>
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        camera={{ position: [0, 0.3, 9.5], fov: 40 }}
        frameloop={reduceMotion ? 'demand' : 'always'}
      >
        <Scene palette={palette} />
        <FrameGovernor reduceMotion={reduceMotion} />
      </Canvas>
    </div>
  )
}
