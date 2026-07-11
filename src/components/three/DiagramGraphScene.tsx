'use client'

import { useRef, useMemo } from 'react'
import { useTheme } from 'next-themes'
import { Canvas, useFrame } from '@react-three/fiber'
import { Line, Text, Billboard, Icosahedron, Octahedron } from '@react-three/drei'
import * as THREE from 'three'
import type { MotionValue } from 'framer-motion'

/* ============================================================
   AR2-DDCQG HERO SCENE — theme-aware crystalline pipeline graph.
   Nodes settle into a clean layered hierarchy (INPUT -> PARSER ->
   GRAPH -> QA spine, with satellite nodes arranged symmetrically
   around it) instead of a scattered cloud. Colors adapt to the
   active theme so the scene reads correctly in both light and
   dark mode.
   ============================================================ */

type Vec3 = [number, number, number]

/* ---- graph data (deterministic) ---- */
const NODE_COUNT = 14
const HIGHLIGHT = new Set([0, 1, 2, 3])
const LABELED = [
  { index: 0, text: 'INPUT' },
  { index: 1, text: 'PARSER' },
  { index: 2, text: 'GRAPH' },
  { index: 3, text: 'QA' },
]

// Initial scattered entrance positions (kept — the "assemble" intro is good,
// only the *settled* layout was the actual problem).
const SCATTERED: Vec3[] = [
  [-5.2, 2.8, -3.1], [4.1, -2.4, 4.2], [-3.8, -1.2, 5.0], [5.5, 2.1, -2.8],
  [-4.5, 3.2, 2.4], [3.2, -3.5, -4.1], [-2.8, 1.5, -5.2], [4.8, 2.9, 3.5],
  [-5.5, -2.8, 1.8], [2.5, 3.8, -3.2], [-1.8, -3.2, 4.8], [5.2, -1.5, 2.1],
  [-3.5, 0.8, -4.5], [3.8, 0.2, 4.0],
]

const FLAT: Vec3[] = [
  [-3.8, 1.6, 0], [-1.3, 1.6, 0], [1.3, 1.6, 0], [3.8, 1.6, 0],
  [-3.8, -0.4, 0], [-1.3, -0.4, 0], [1.3, -0.4, 0], [3.8, -0.4, 0],
  [-3.8, -2.2, 0], [-1.3, -2.2, 0], [1.3, -2.2, 0], [3.8, -2.2, 0],
  [0, 0.6, 0], [0, -1.2, 0],
]

// GRAPH: a clean geometric hierarchy — the four labeled pipeline nodes
// (INPUT, PARSER, GRAPH, QA) form a straight horizontal spine at y=0.
// The remaining ten nodes are arranged in two symmetric tiers above and
// below the spine, evenly spaced, so the shape reads as an intentional
// system diagram rather than a random cloud.
const SPINE_X = [-4.5, -1.5, 1.5, 4.5]
const GRAPH: Vec3[] = [
  // 0-3: pipeline spine (INPUT -> PARSER -> GRAPH -> QA)
  [SPINE_X[0], 0, 0], [SPINE_X[1], 0, 0], [SPINE_X[2], 0, 0], [SPINE_X[3], 0, 0],
  // 4-7: upper tier, evenly spaced, gentle depth offset for parallax
  [-3.0, 2.2, -0.6], [-1.0, 2.2, 0.6], [1.0, 2.2, -0.6], [3.0, 2.2, 0.6],
  // 8-10: lower tier
  [-2.0, -2.2, 0.6], [0, -2.2, -0.6], [2.0, -2.2, 0.6],
  // 11-13: outer flanks + apex, framing the composition symmetrically
  [-5.6, 0, -1.2], [5.6, 0, -1.2], [0, 0, 1.8],
]

const EDGES: [number, number][] = [
  // spine
  [0, 1], [1, 2], [2, 3],
  // spine -> upper tier
  [0, 4], [1, 5], [2, 6], [3, 7],
  // spine -> lower tier
  [0, 8], [1, 9], [2, 9], [3, 10],
  // upper tier chain
  [4, 5], [5, 6], [6, 7],
  // lower tier chain
  [8, 9], [9, 10],
  // flanks + apex
  [11, 0], [13, 3], [12, 3], [13, 2],
]

/* quadratic bezier point: p0, control(mid+offset), p1 */
function bezierPoint(p0: Vec3, p1: Vec3, t: number, arc: number): Vec3 {
  const mid: Vec3 = [
    (p0[0] + p1[0]) / 2,
    (p0[1] + p1[1]) / 2,
    (p0[2] + p1[2]) / 2,
  ]
  const dx = p1[0] - p0[0]
  const dy = p1[1] - p0[1]
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  const ctrl: Vec3 = [
    mid[0] + (-dy / len) * arc,
    mid[1] + (dx / len) * arc,
    mid[2] + 0.3,
  ]
  const mt = 1 - t
  return [
    mt * mt * p0[0] + 2 * mt * t * ctrl[0] + t * t * p1[0],
    mt * mt * p0[1] + 2 * mt * t * ctrl[1] + t * t * p1[1],
    mt * mt * p0[2] + 2 * mt * t * ctrl[2] + t * t * p1[2],
  ]
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

/* ---- theme-aware palette ---- */
interface Palette {
  gold: string
  goldDeep: string
  rose: string
  amber: string
  domeColor: string
  fogColor: string
  fogNear: number
  fogFar: number
  textColor: string
  textOutline: string
  ambientIntensity: number
  hemiSky: string
  hemiGround: string
  hemiIntensity: number
  dirIntensity: number
  dirColor: string
  pointIntensity: number
  particleBase: string
  particleOpacity: number
  edgeOpacity: number
  glowOpacity: number
  glowOpacityHighlight: number
  emissiveIntensity: number
  emissiveIntensityHighlight: number
}

const DARK_PALETTE: Palette = {
  gold: '#fbbf24',
  goldDeep: '#f59e0b',
  rose: '#f43f5e',
  amber: '#fb923c',
  domeColor: '#0c0a08',
  fogColor: '#1a1410',
  fogNear: 14,
  fogFar: 42,
  textColor: '#fef3c7',
  textOutline: '#06080f',
  ambientIntensity: 0.18,
  hemiSky: '#fbbf24',
  hemiGround: '#1a1410',
  hemiIntensity: 0.35,
  dirIntensity: 1.4,
  dirColor: '#fef3c7',
  pointIntensity: 10,
  particleBase: '#fef3c7',
  particleOpacity: 0.55,
  edgeOpacity: 0.22,
  glowOpacity: 0.06,
  glowOpacityHighlight: 0.12,
  emissiveIntensity: 0.5,
  emissiveIntensityHighlight: 1.2,
}

// Light mode: deep, saturated node colors (not pastel) against a soft warm
// off-white dome, with glow/bloom effects toned way down since additive
// blending that reads as a bloom on black turns into a washed-out haze on
// white. Text switches to a dark ink color with a light outline.
const LIGHT_PALETTE: Palette = {
  gold: '#b45309',
  goldDeep: '#92400e',
  rose: '#be123c',
  amber: '#c2410c',
  domeColor: '#f5f1e8',
  fogColor: '#ede7d9',
  fogNear: 16,
  fogFar: 46,
  textColor: '#292118',
  textOutline: '#fdfaf3',
  ambientIntensity: 0.65,
  hemiSky: '#fff7ec',
  hemiGround: '#d8cdb4',
  hemiIntensity: 0.55,
  dirIntensity: 1.1,
  dirColor: '#fffaf0',
  pointIntensity: 4,
  particleBase: '#92400e',
  particleOpacity: 0.28,
  edgeOpacity: 0.35,
  glowOpacity: 0.02,
  glowOpacityHighlight: 0.05,
  emissiveIntensity: 0.15,
  emissiveIntensityHighlight: 0.4,
}

interface SceneProps {
  scrollY: MotionValue<number>
  reduced: boolean
}

export function DiagramGraphScene({ scrollY, reduced }: SceneProps) {
  const { resolvedTheme } = useTheme()
  const palette = resolvedTheme === 'light' ? LIGHT_PALETTE : DARK_PALETTE

  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 0.5, 9], fov: 50 }}
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
  const positionsRef = useRef<Vec3[]>(
    SCATTERED.map((p) => [...p] as Vec3)
  )
  const clockRef = useRef(0)

  useFrame((state) => {
    const dt = state.clock.getDelta()
    clockRef.current += dt
    const t = clockRef.current

    const p1 = smoothstep(0, 2.5, t)
    const p2 = smoothstep(2.5, 4.5, t)

    for (let i = 0; i < NODE_COUNT; i++) {
      const s = SCATTERED[i]
      const f = FLAT[i]
      const g = GRAPH[i]
      const pos = positionsRef.current[i]
      pos[0] = THREE.MathUtils.lerp(THREE.MathUtils.lerp(s[0], f[0], p1), g[0], p2)
      pos[1] = THREE.MathUtils.lerp(THREE.MathUtils.lerp(s[1], f[1], p1), g[1], p2)
      pos[2] = THREE.MathUtils.lerp(THREE.MathUtils.lerp(s[2], f[2], p1), g[2], p2)
      if (HIGHLIGHT.has(i) && !reduced) {
        pos[1] += Math.sin(t * 1.4 + i) * 0.06
      }
    }

    if (groupRef.current) {
      if (!reduced) {
        groupRef.current.rotation.y =
          scrollY.get() * Math.PI * 0.5 + t * 0.06
        groupRef.current.rotation.x = Math.sin(t * 0.2) * 0.04
      }
    }

    const introT = Math.min(1, t / 2)
    const introEase = 1 - Math.pow(1 - introT, 5)
    const baseZ = 16 - introEase * 7
    const scrollZ = baseZ - scrollY.get() * 4
    const scrollYCam = 2 - introEase * 1.5 - scrollY.get() * 1.5
    const px = state.pointer.x
    const py = state.pointer.y
    const handheld = reduced ? 0 : 0.12
    state.camera.position.x = THREE.MathUtils.lerp(
      state.camera.position.x,
      px * 0.8 + Math.sin(t * 0.5) * handheld,
      0.04
    )
    state.camera.position.y = THREE.MathUtils.lerp(
      state.camera.position.y,
      scrollYCam + py * 0.5 + Math.cos(t * 0.4) * handheld,
      0.04
    )
    state.camera.position.z = THREE.MathUtils.lerp(
      state.camera.position.z,
      scrollZ,
      0.05
    )
    state.camera.lookAt(
      0,
      -0.4 * (1 - introEase) - scrollY.get() * 0.5,
      0
    )
  })

  return (
    <>
      <ambientLight intensity={palette.ambientIntensity} />
      <hemisphereLight args={[palette.hemiSky, palette.hemiGround, palette.hemiIntensity]} />
      <directionalLight position={[5, 8, 5]} intensity={palette.dirIntensity} color={palette.dirColor} />
      <pointLight position={[-6, 2, 4]} intensity={palette.pointIntensity} distance={16} color={palette.gold} />
      <pointLight position={[6, -2, 4]} intensity={palette.pointIntensity} distance={16} color={palette.rose} />
      <pointLight position={[0, 4, -4]} intensity={palette.pointIntensity * 0.6} distance={12} color={palette.amber} />

      <mesh scale={60}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial side={THREE.BackSide} color={palette.domeColor} />
      </mesh>

      <ParticleField reduced={reduced} palette={palette} />

      <group ref={groupRef}>
        {Array.from({ length: NODE_COUNT }).map((_, i) => (
          <GraphNode
            key={i}
            index={i}
            posRef={positionsRef}
            reduced={reduced}
            clockRef={clockRef}
            palette={palette}
          />
        ))}

        {EDGES.map(([a, b], i) => (
          <GraphEdge
            key={i}
            index={i}
            from={a}
            to={b}
            posRef={positionsRef}
            reduced={reduced}
            clockRef={clockRef}
            palette={palette}
          />
        ))}

        {LABELED.map(({ index, text }) => (
          <NodeLabel
            key={text}
            index={index}
            posRef={positionsRef}
            text={text}
            palette={palette}
          />
        ))}
      </group>
    </>
  )
}

/* ---- node (crystalline icosahedron + glow halo) ---- */
function GraphNode({
  index,
  posRef,
  reduced,
  clockRef,
  palette,
}: {
  index: number
  posRef: React.RefObject<Vec3[]>
  reduced: boolean
  clockRef: React.RefObject<number>
  palette: Palette
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const haloRef = useRef<THREE.Mesh>(null)
  const isHighlight = HIGHLIGHT.has(index)
  const color = isHighlight ? palette.rose : (index % 3 === 0 ? palette.amber : palette.gold)

  useFrame(() => {
    const pos = posRef.current[index]
    if (meshRef.current) {
      meshRef.current.position.set(pos[0], pos[1], pos[2])
      if (!reduced && isHighlight) {
        meshRef.current.rotation.y += 0.004
        meshRef.current.rotation.x += 0.002
        const pulse = 0.6 + Math.sin((clockRef.current || 0) * 1.2 + index) * 0.5
        const mat = meshRef.current.material as THREE.MeshStandardMaterial
        mat.emissiveIntensity = palette.emissiveIntensityHighlight + pulse * (palette.emissiveIntensityHighlight * 0.5)
      } else if (!reduced) {
        meshRef.current.rotation.y += 0.002
      }
    }
    if (haloRef.current) {
      haloRef.current.position.set(pos[0], pos[1], pos[2])
    }
  })

  return (
    <>
      <mesh ref={meshRef}>
        {isHighlight ? (
          <Icosahedron args={[0.28, 0]} />
        ) : (
          <Octahedron args={[0.16, 0]} />
        )}
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isHighlight ? palette.emissiveIntensityHighlight : palette.emissiveIntensity}
          roughness={0.2}
          metalness={0.85}
          flatShading
        />
      </mesh>
      {isHighlight && (
        <mesh ref={haloRef} scale={1.35}>
          <Icosahedron args={[0.28, 0]} />
          <meshBasicMaterial
            color={color}
            wireframe
            transparent
            opacity={0.18}
          />
        </mesh>
      )}
      <mesh ref={isHighlight ? undefined : haloRef} scale={isHighlight ? 2.8 : 2.2}>
        <sphereGeometry args={[0.16, 12, 12]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={isHighlight ? palette.glowOpacityHighlight : palette.glowOpacity}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </>
  )
}

/* ---- curved bezier edge + traveling pulse ---- */
function GraphEdge({
  index,
  from,
  to,
  posRef,
  reduced,
  clockRef,
  palette,
}: {
  index: number
  from: number
  to: number
  posRef: React.RefObject<Vec3[]>
  reduced: boolean
  clockRef: React.RefObject<number>
  palette: Palette
}) {
  const pulseRef = useRef<THREE.Mesh>(null)
  const arc = useMemo(() => 0.4 + (index % 3) * 0.15, [index])
  const isHighlightEdge = HIGHLIGHT.has(from) && HIGHLIGHT.has(to)

  const points = useMemo(() => {
    const pts: THREE.Vector3[] = []
    const p0 = SCATTERED[from]
    const p1 = SCATTERED[to]
    for (let i = 0; i <= 16; i++) {
      const t = i / 16
      const [x, y, z] = bezierPoint(p0, p1, t, arc)
      pts.push(new THREE.Vector3(x, y, z))
    }
    return pts
  }, [from, to, arc])

  useFrame(() => {
    const p0 = posRef.current[from]
    const p1 = posRef.current[to]
    for (let i = 0; i <= 16; i++) {
      const t = i / 16
      const [x, y, z] = bezierPoint(p0, p1, t, arc)
      points[i].set(x, y, z)
    }
    if (pulseRef.current && !reduced) {
      const phase = ((clockRef.current || 0) * 0.15 + index / EDGES.length) % 1
      const [x, y, z] = bezierPoint(p0, p1, phase, arc)
      pulseRef.current.position.set(x, y, z)
      const s = 0.04 + Math.sin(phase * Math.PI) * 0.05
      pulseRef.current.scale.setScalar(Math.max(0.01, s))
      const mat = pulseRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = Math.sin(phase * Math.PI) * 0.9
    }
  })

  const lineColor = isHighlightEdge ? palette.rose : (from % 3 === 0 ? palette.amber : palette.gold)

  return (
    <>
      <Line
        points={points}
        color={lineColor}
        lineWidth={1}
        transparent
        opacity={palette.edgeOpacity}
        depthWrite={false}
      />
      <mesh ref={pulseRef}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial
          color={isHighlightEdge ? palette.rose : palette.goldDeep}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </>
  )
}

/* ---- label ---- */
function NodeLabel({
  index,
  posRef,
  text,
  palette,
}: {
  index: number
  posRef: React.RefObject<Vec3[]>
  text: string
  palette: Palette
}) {
  const ref = useRef<THREE.Group>(null)
  useFrame(() => {
    const pos = posRef.current[index]
    if (ref.current) {
      ref.current.position.set(pos[0], pos[1] - 0.5, pos[2])
    }
  })
  return (
    <Billboard ref={ref}>
      <Text
        fontSize={0.16}
        color={palette.textColor}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.004}
        outlineColor={palette.textOutline}
      >
        {text}
      </Text>
    </Billboard>
  )
}

/* ---- volumetric particle cloud ---- */
function ParticleField({ reduced, palette }: { reduced: boolean; palette: Palette }) {
  const ref = useRef<THREE.Points>(null)
  const COUNT = 800

  const { positions, colors, sizes } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3)
    const colors = new Float32Array(COUNT * 3)
    const sizes = new Float32Array(COUNT)
    const goldCol = new THREE.Color(palette.gold)
    const roseCol = new THREE.Color(palette.rose)
    const amberCol = new THREE.Color(palette.amber)
    const baseCol = new THREE.Color(palette.particleBase)
    for (let i = 0; i < COUNT; i++) {
      const r = 20 + Math.random() * 25
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)
      const roll = Math.random()
      const c = roll < 0.08 ? roseCol : roll < 0.2 ? amberCol : roll < 0.45 ? goldCol : baseCol
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
      sizes[i] = 0.5 + Math.random() * 2.5
    }
    return { positions, colors, sizes }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [palette.gold, palette.rose, palette.amber, palette.particleBase])

  useFrame((state) => {
    if (ref.current && !reduced) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.012
      ref.current.rotation.x = state.clock.elapsedTime * 0.005
    }
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={COUNT}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
          count={COUNT}
        />
        <bufferAttribute
          attach="attributes-size"
          args={[sizes, 1]}
          count={COUNT}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
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
