'use client'

import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import * as THREE from 'three'

/* ============================================================
   DiagramShapes3D — real 3D version of DiagramShapes. Small solid-
   color glowing meshes (sphere/cone/box/octahedron standing in for
   circle/triangle/square/hexagon) that start scattered in 3D space
   and assemble into a connected diagram as the user scrolls, with a
   little parallax drift toward the cursor. Lightweight — flat
   transparent MeshBasicMaterial, no transmission/refraction, no
   environment map, so this stays cheap to render continuously.
   ============================================================ */

type ShapeKind = 'sphere' | 'cone' | 'box' | 'octahedron'
const SHAPE_KINDS: ShapeKind[] = ['sphere', 'cone', 'box', 'octahedron']

interface NodeDef {
  sx: number
  sy: number
  sz: number
  tx: number
  ty: number
  tz: number
  size: number
  kind: ShapeKind
  colorIdx: number
  rotSpeed: [number, number, number]
  phase: number
}

const NODE_COUNT = 46
const CONNECT_DISTANCE = 3.2
const MAX_CONNECTIONS_PER_NODE = 3
const SPINE_COUNT = 4

const LIGHT_COLORS = ['#2b59d1', '#ff9473', '#a7fccd', '#ecda98']
const DARK_COLORS = ['#8052ff', '#ffb829', '#15846e', '#bdbdbd']

function rand(seed: number) {
  const x = Math.sin(seed) * 43758.5453
  return x - Math.floor(x)
}

function buildNodes(): NodeDef[] {
  const nodes: NodeDef[] = []
  for (let i = 0; i < NODE_COUNT; i++) {
    const s = i * 7.31
    const sx = (rand(s * 1.1) - 0.5) * 16
    const sy = (rand(s * 2.3) - 0.5) * 10
    const sz = (rand(s * 2.9) - 0.5) * 8

    let tx: number
    let ty: number
    const tz = (rand(s * 3.3) - 0.5) * 2.5

    if (i < SPINE_COUNT) {
      tx = -4.5 + (i / (SPINE_COUNT - 1)) * 9
      ty = (rand(s * 3.7) - 0.5) * 0.8
    } else {
      const angle = rand(s * 4.1) * Math.PI * 2
      const radius = 1.8 + rand(s * 5.3) * 2.6
      const anchorIdx = Math.floor(rand(s * 6.1) * SPINE_COUNT)
      const anchorX = -4.5 + (anchorIdx / (SPINE_COUNT - 1)) * 9
      tx = anchorX + Math.cos(angle) * radius
      ty = Math.sin(angle) * radius * 0.7
    }

    nodes.push({
      sx,
      sy,
      sz,
      tx,
      ty,
      tz,
      size: 0.12 + rand(s * 7.9) * 0.22,
      kind: SHAPE_KINDS[Math.floor(rand(s * 9.1) * SHAPE_KINDS.length)],
      colorIdx: Math.floor(rand(s * 11.3) * 4),
      rotSpeed: [
        (rand(s * 13.1) - 0.5) * 0.4,
        (rand(s * 13.9) - 0.5) * 0.4,
        (rand(s * 14.7) - 0.5) * 0.4,
      ],
      phase: rand(s * 17.3) * Math.PI * 2,
    })
  }
  return nodes
}

function smoothstep(x: number) {
  const t = Math.max(0, Math.min(1, x))
  return t * t * (3 - 2 * t)
}

interface SceneProps {
  colors: string[]
}

function Shape({ node, colors }: { node: NodeDef; colors: string[] }) {
  const ref = useRef<THREE.Mesh>(null)
  const color = colors[node.colorIdx]

  useFrame((state) => {
    const mesh = ref.current
    if (!mesh) return
    const t = state.clock.elapsedTime

    const progress: number = state.scene.userData.progress ?? 0
    const eased = smoothstep(progress)

    const baseX = node.sx + (node.tx - node.sx) * eased
    const baseY = node.sy + (node.ty - node.sy) * eased
    const baseZ = node.sz + (node.tz - node.sz) * eased

    const driftAmount = 0.18 * (1 - eased * 0.7)
    const driftX = Math.sin(t * 0.4 + node.phase) * driftAmount
    const driftY = Math.cos(t * 0.35 + node.phase) * driftAmount

    const pointer = state.pointer
    const pointerPull = 0.6 * (1 - eased)

    mesh.position.set(
      baseX + pointer.x * pointerPull + driftX,
      baseY + pointer.y * pointerPull + driftY,
      baseZ
    )
    mesh.rotation.x += node.rotSpeed[0] * 0.01
    mesh.rotation.y += node.rotSpeed[1] * 0.01
    mesh.rotation.z += node.rotSpeed[2] * 0.01

    const mat = mesh.material as THREE.MeshBasicMaterial
    mat.opacity = 0.35 + eased * 0.45
  })

  return (
    <mesh ref={ref}>
      {node.kind === 'sphere' && <sphereGeometry args={[node.size, 12, 12]} />}
      {node.kind === 'box' && <boxGeometry args={[node.size, node.size, node.size]} />}
      {node.kind === 'cone' && <coneGeometry args={[node.size * 0.7, node.size * 1.3, 4]} />}
      {node.kind === 'octahedron' && <octahedronGeometry args={[node.size * 0.8, 0]} />}
      <meshBasicMaterial color={color} transparent opacity={0.4} depthWrite={false} />
    </mesh>
  )
}

function ConnectingLines({ nodes, colors }: { nodes: NodeDef[]; colors: string[] }) {
  const lineRefs = useRef<(THREE.Line | null)[]>([])

  const edges = useMemo(() => {
    const pairs: { i: number; j: number; dist: number }[] = []
    for (let i = 0; i < nodes.length; i++) {
      const candidates: { j: number; dist: number }[] = []
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].tx - nodes[j].tx
        const dy = nodes[i].ty - nodes[j].ty
        const dz = nodes[i].tz - nodes[j].tz
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
        if (dist < CONNECT_DISTANCE) candidates.push({ j, dist })
      }
      candidates.sort((a, b) => a.dist - b.dist)
      for (const c of candidates.slice(0, MAX_CONNECTIONS_PER_NODE)) {
        pairs.push({ i, j: c.j, dist: c.dist })
      }
    }
    return pairs
  }, [nodes])

  useFrame((state) => {
    const progress: number = state.scene.userData.progress ?? 0
    const eased = smoothstep(progress)
    const lineAlpha = Math.max(0, eased - 0.35) / 0.65

    edges.forEach((edge, idx) => {
      const lineObj = lineRefs.current[idx]
      if (!lineObj) return
      const a = nodes[edge.i]
      const b = nodes[edge.j]
      const ax = a.sx + (a.tx - a.sx) * eased
      const ay = a.sy + (a.ty - a.sy) * eased
      const az = a.sz + (a.tz - a.sz) * eased
      const bx = b.sx + (b.tx - b.sx) * eased
      const by = b.sy + (b.ty - b.sy) * eased
      const bz = b.sz + (b.tz - b.sz) * eased

      const positions = (lineObj.geometry as THREE.BufferGeometry).attributes.position
      if (positions) {
        positions.setXYZ(0, ax, ay, az)
        positions.setXYZ(1, bx, by, bz)
        positions.needsUpdate = true
      }
      const mat = lineObj.material as THREE.LineBasicMaterial
      mat.opacity = (1 - edge.dist / CONNECT_DISTANCE) * lineAlpha * 0.55
    })
  })

  return (
    <group>
      {edges.map((edge, idx) => (
        <Line
          key={idx}
          ref={(el) => {
            lineRefs.current[idx] = el as unknown as THREE.Line
          }}
          points={[
            [nodes[edge.i].sx, nodes[edge.i].sy, nodes[edge.i].sz],
            [nodes[edge.j].sx, nodes[edge.j].sy, nodes[edge.j].sz],
          ]}
          color={colors[0]}
          transparent
          opacity={0}
          lineWidth={1}
        />
      ))}
    </group>
  )
}

function Scene({ colors }: SceneProps) {
  const nodes = useMemo(() => buildNodes(), [])

  useFrame((state) => {
    if (typeof window === 'undefined') return
    const p = Math.min(1, Math.max(0, window.scrollY / (window.innerHeight * 0.7)))
    state.scene.userData.progress = p
  })

  return (
    <>
      <ambientLight intensity={0.6} />
      {nodes.map((node, i) => (
        <Shape key={i} node={node} colors={colors} />
      ))}
      <ConnectingLines nodes={nodes} colors={colors} />
    </>
  )
}

export default function DiagramShapes3D({
  className,
  theme,
}: {
  className?: string
  theme: 'light' | 'dark'
}) {
  const colors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS

  return (
    <div className={className}>
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        camera={{ position: [0, 0, 9], fov: 50 }}
      >
        <Scene colors={colors} />
      </Canvas>
    </div>
  )
}
