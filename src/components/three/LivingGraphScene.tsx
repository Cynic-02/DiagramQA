'use client'

import { useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

/* ============================================================
   LivingGraphScene — replaces the flat scattered-polygon hero
   background with an actual knowledge graph: the real subject of
   this product (diagram -> extracted entities/relations -> verified
   Q&A). Nodes are small glass-like glowing orbs with true depth
   (MeshPhysicalMaterial + point lights + soft layered glow shells,
   not flat MeshBasicMaterial silhouettes). Edges are thin emissive
   lines. Light "pulses" continuously travel node-to-node along
   edges — a literal, satisfying visualization of "data flowing
   through the pipeline," always alive rather than a one-shot
   assemble-and-stop.

   Colors are read live from the page's own CSS custom properties
   (same approach as SiteConstellation) so both themes stay in sync
   with whatever the design system defines, with zero hardcoded hex
   list to drift.
   ============================================================ */

function readPalette(): string[] {
  if (typeof document === 'undefined') return ['#3ba4c7', '#e8876f', '#f0b84a', '#5bb896', '#5bbde0']
  const style = getComputedStyle(document.documentElement)
  const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback
  return [
    read('--primary', '#3ba4c7'),
    read('--diagram-coral', '#e8876f'),
    read('--diagram-gold', '#f0b84a'),
    read('--diagram-mint', '#5bb896'),
    read('--diagram-sky', '#5bbde0'),
  ]
}

interface GraphNode {
  /** scattered start position */
  s: THREE.Vector3
  /** settled graph position */
  t: THREE.Vector3
  size: number
  color: THREE.Color
  phase: number
  driftSpeed: number
}

interface GraphEdge {
  a: number
  b: number
  /** 0..1 offset so pulses don't all travel in lockstep */
  pulseOffset: number
}

const NODE_COUNT = 26
const EDGE_TARGET_PER_NODE = 2.1

function rand(seed: number) {
  const x = Math.sin(seed) * 43758.5453
  return x - Math.floor(x)
}

function buildGraph(colors: THREE.Color[]): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = []

  // Settled layout: a loose 3D lattice with organic jitter, roughly
  // spherical so it reads well from any camera angle and doesn't
  // favor a particular aspect ratio.
  for (let i = 0; i < NODE_COUNT; i++) {
    const s = i * 12.9898
    // Fibonacci sphere distribution for even settled spacing
    const k = i + 0.5
    const phi = Math.acos(1 - (2 * k) / NODE_COUNT)
    const theta = Math.PI * (1 + Math.sqrt(5)) * k
    const radius = 3.4 + rand(s * 3.1) * 1.1

    const tx = radius * Math.sin(phi) * Math.cos(theta)
    const ty = radius * Math.sin(phi) * Math.sin(theta) * 0.72
    const tz = radius * Math.cos(phi) * 0.85

    const scatterRadius = 9 + rand(s * 5.7) * 5
    const sx = (rand(s * 1.7) - 0.5) * scatterRadius * 2
    const sy = (rand(s * 2.3) - 0.5) * scatterRadius * 1.3
    const sz = (rand(s * 3.9) - 0.5) * scatterRadius

    nodes.push({
      s: new THREE.Vector3(sx, sy, sz),
      t: new THREE.Vector3(tx, ty, tz),
      size: 0.09 + rand(s * 7.3) * 0.1,
      color: colors[Math.floor(rand(s * 9.9) * colors.length)].clone(),
      phase: rand(s * 11.1) * Math.PI * 2,
      driftSpeed: 0.15 + rand(s * 13.7) * 0.2,
    })
  }

  // Build edges from nearest-neighbor pairs in settled space, capped
  // per node so the graph reads as a diagram, not a hairball.
  const edges: GraphEdge[] = []
  const edgeCounts = new Array(NODE_COUNT).fill(0)
  const candidateEdges: { i: number; j: number; dist: number }[] = []
  for (let i = 0; i < NODE_COUNT; i++) {
    for (let j = i + 1; j < NODE_COUNT; j++) {
      candidateEdges.push({ i, j, dist: nodes[i].t.distanceTo(nodes[j].t) })
    }
  }
  candidateEdges.sort((a, b) => a.dist - b.dist)
  const maxEdges = Math.round(NODE_COUNT * EDGE_TARGET_PER_NODE)
  for (const c of candidateEdges) {
    if (edges.length >= maxEdges) break
    if (edgeCounts[c.i] >= 4 || edgeCounts[c.j] >= 4) continue
    edges.push({ a: c.i, b: c.j, pulseOffset: rand(c.i * 3.3 + c.j * 7.7) })
    edgeCounts[c.i]++
    edgeCounts[c.j]++
  }
  return { nodes, edges }
}

function smoothstep(x: number) {
  const t = Math.max(0, Math.min(1, x))
  return t * t * (3 - 2 * t)
}

/* ---- Nodes: instanced core + instanced soft glow shell ---- */

function GraphNodes({ nodes, progressRef }: { nodes: GraphNode[]; progressRef: React.RefObject<number> }) {
  const coreRef = useRef<THREE.InstancedMesh>(null)
  const glowRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const tmpColor = useMemo(() => new THREE.Color(), [])

  useEffect(() => {
    const core = coreRef.current
    const glow = glowRef.current
    if (!core || !glow) return
    nodes.forEach((n, i) => {
      core.setColorAt(i, n.color)
      tmpColor.copy(n.color)
      glow.setColorAt(i, tmpColor)
    })
    if (core.instanceColor) core.instanceColor.needsUpdate = true
    if (glow.instanceColor) glow.instanceColor.needsUpdate = true
  }, [nodes, tmpColor])

  useFrame((state) => {
    const core = coreRef.current
    const glow = glowRef.current
    if (!core || !glow) return
    const eased = smoothstep(progressRef.current ?? 0)
    const t = state.clock.elapsedTime

    nodes.forEach((n, i) => {
      const bx = n.s.x + (n.t.x - n.s.x) * eased
      const by = n.s.y + (n.t.y - n.s.y) * eased
      const bz = n.s.z + (n.t.z - n.s.z) * eased

      const breathe = 1 + Math.sin(t * n.driftSpeed + n.phase) * 0.14
      const driftAmt = 0.25 * (1 - eased * 0.6)
      const dx = Math.sin(t * 0.3 + n.phase) * driftAmt
      const dy = Math.cos(t * 0.26 + n.phase * 1.3) * driftAmt

      dummy.position.set(bx + dx, by + dy, bz)
      dummy.scale.setScalar(n.size * breathe)
      dummy.updateMatrix()
      core.setMatrixAt(i, dummy.matrix)

      dummy.scale.setScalar(n.size * breathe * 2.6)
      dummy.updateMatrix()
      glow.setMatrixAt(i, dummy.matrix)
    })
    core.instanceMatrix.needsUpdate = true
    glow.instanceMatrix.needsUpdate = true
  })

  return (
    <>
      {/* Soft outer glow shell — additive, very transparent, gives
          the impression of light bleeding into the fog rather than
          a hard-edged sprite. */}
      <instancedMesh ref={glowRef} args={[undefined, undefined, nodes.length]}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshBasicMaterial
          transparent
          opacity={0.09}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </instancedMesh>
      {/* Core — physical material so it actually catches the point
          lights and reads as a small glass/glowing bead, not a flat
          disc. */}
      <instancedMesh ref={coreRef} args={[undefined, undefined, nodes.length]}>
        <sphereGeometry args={[1, 20, 20]} />
        <meshPhysicalMaterial
          roughness={0.25}
          metalness={0.1}
          transmission={0.15}
          thickness={0.6}
          emissiveIntensity={1.4}
          emissive={new THREE.Color('#ffffff')}
          toneMapped={false}
        />
      </instancedMesh>
    </>
  )
}

/* ---- Edges: thin emissive lines between node pairs ---- */

function GraphEdges({
  nodes,
  edges,
  progressRef,
  baseColor,
}: {
  nodes: GraphNode[]
  edges: GraphEdge[]
  progressRef: React.RefObject<number>
  baseColor: THREE.Color
}) {
  const groupRef = useRef<THREE.Group>(null)
  const lineRefs = useRef<(THREE.LineSegments | null)[]>([])

  useFrame(() => {
    const eased = smoothstep(progressRef.current ?? 0)
    const alpha = Math.max(0, eased - 0.25) / 0.75

    edges.forEach((edge, idx) => {
      const line = lineRefs.current[idx]
      if (!line) return
      const a = nodes[edge.a]
      const b = nodes[edge.b]
      const ax = a.s.x + (a.t.x - a.s.x) * eased
      const ay = a.s.y + (a.t.y - a.s.y) * eased
      const az = a.s.z + (a.t.z - a.s.z) * eased
      const bx = b.s.x + (b.t.x - b.s.x) * eased
      const by = b.s.y + (b.t.y - b.s.y) * eased
      const bz = b.s.z + (b.t.z - b.s.z) * eased

      const pos = line.geometry.attributes.position as THREE.BufferAttribute
      pos.setXYZ(0, ax, ay, az)
      pos.setXYZ(1, bx, by, bz)
      pos.needsUpdate = true

      const mat = line.material as THREE.LineBasicMaterial
      mat.opacity = alpha * 0.34
    })
  })

  return (
    <group ref={groupRef}>
      {edges.map((edge, idx) => (
        <lineSegments
          key={idx}
          ref={(el) => {
            lineRefs.current[idx] = el
          }}
        >
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[new Float32Array(6), 3]} />
          </bufferGeometry>
          <lineBasicMaterial color={baseColor} transparent opacity={0} depthWrite={false} />
        </lineSegments>
      ))}
    </group>
  )
}

/* ---- Pulses: small bright spheres traveling along each edge on a
   staggered loop — the signature "data flowing through the
   pipeline" moment. ---- */

function EdgePulses({
  nodes,
  edges,
  progressRef,
  colors,
}: {
  nodes: GraphNode[]
  edges: GraphEdge[]
  progressRef: React.RefObject<number>
  colors: THREE.Color[]
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const pulseColors = useMemo(
    () => edges.map((_, i) => colors[i % colors.length]),
    [edges, colors]
  )

  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    edges.forEach((_, i) => mesh.setColorAt(i, pulseColors[i]))
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [edges, pulseColors])

  useFrame((state) => {
    const mesh = meshRef.current
    if (!mesh) return
    const eased = smoothstep(progressRef.current ?? 0)
    const visibility = Math.max(0, eased - 0.4) / 0.6
    const t = state.clock.elapsedTime * 0.35

    edges.forEach((edge, i) => {
      const a = nodes[edge.a].t
      const b = nodes[edge.b].t
      const localT = (t * (0.6 + (i % 5) * 0.08) + edge.pulseOffset) % 1
      const px = a.x + (b.x - a.x) * localT
      const py = a.y + (b.y - a.y) * localT
      const pz = a.z + (b.z - a.z) * localT

      dummy.position.set(px, py, pz)
      const pulseFade = Math.sin(localT * Math.PI) // fades in/out at each edge's ends
      dummy.scale.setScalar(visibility > 0 ? 0.045 * pulseFade + 0.01 : 0.0001)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, edges.length]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial toneMapped={false} transparent opacity={0.9} depthWrite={false} blending={THREE.AdditiveBlending} />
    </instancedMesh>
  )
}

/* ---- Scene wrapper: scroll progress + gentle whole-graph rotation ---- */

function Scene({ palette }: { palette: string[] }) {
  const { nodes, edges } = useMemo(() => {
    const colors = palette.map((hex) => new THREE.Color(hex))
    return buildGraph(colors)
  }, [palette])

  const colorObjs = useMemo(() => palette.map((hex) => new THREE.Color(hex)), [palette])
  const groupRef = useRef<THREE.Group>(null)
  const progressRef = useRef(0)

  useFrame((state) => {
    if (typeof window !== 'undefined') {
      const p = Math.min(1, Math.max(0, window.scrollY / (window.innerHeight * 0.7)))
      progressRef.current = p
    }
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.028
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.07) * 0.06
      // subtle cursor parallax, strongest before the graph settles
      const eased = smoothstep(progressRef.current)
      groupRef.current.rotation.y += state.pointer.x * 0.12 * (1 - eased * 0.7)
      groupRef.current.rotation.x += -state.pointer.y * 0.08 * (1 - eased * 0.7)
    }
  })

  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.4} />
      <pointLight position={[4, 3, 5]} intensity={18} color={palette[0]} distance={14} decay={2} />
      <pointLight position={[-4, -2, 3]} intensity={14} color={palette[1]} distance={14} decay={2} />
      <pointLight position={[0, 4, -3]} intensity={10} color={palette[2]} distance={16} decay={2} />

      <GraphEdges nodes={nodes} edges={edges} progressRef={progressRef} baseColor={colorObjs[0]} />
      <GraphNodes nodes={nodes} progressRef={progressRef} />
      <EdgePulses nodes={nodes} edges={edges} progressRef={progressRef} colors={colorObjs} />
    </group>
  )
}

/** Keeps the canvas rendering at least once when reduced-motion is on,
    since frameloop="demand" otherwise renders nothing at all. */
function FrameGovernor({ reduceMotion }: { reduceMotion: boolean }) {
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => {
    if (reduceMotion) invalidate()
  }, [reduceMotion, invalidate])
  return null
}

export default function LivingGraphScene({
  className,
  theme,
}: {
  className?: string
  theme: 'light' | 'dark'
}) {
  const [palette, setPalette] = useState<string[]>(['#3ba4c7', '#e8876f', '#f0b84a', '#5bb896', '#5bbde0'])
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    setPalette(readPalette())
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
        camera={{ position: [0, 0.4, 10.5], fov: 42 }}
        frameloop={reduceMotion ? 'demand' : 'always'}
      >
        <Scene palette={palette} />
        <FrameGovernor reduceMotion={reduceMotion} />
      </Canvas>
    </div>
  )
}
