'use client'

import { useEffect, useRef } from 'react'

/* ============================================================
   DiagramShapes — replaces the earlier "5 big glass cubes" hero
   background (ChromaticPrism / MonadPrism) with a genuinely
   different mechanic: many small, transparent, varied-shape
   particles (circle / triangle / square / hexagon) that start
   scattered and assemble into a connected node-diagram as the user
   scrolls, with a little parallax drift toward the cursor.

   Built with Canvas 2D rather than three.js/WebGL — this is a flat
   diagram-assembly effect (shapes + connecting lines), not a
   volumetric one, so a 2D canvas is the right-weight tool and avoids
   fighting react-three-fiber for something that isn't 3D.
   ============================================================ */

type ShapeKind = 'circle' | 'triangle' | 'square' | 'hexagon'
const SHAPE_KINDS: ShapeKind[] = ['circle', 'triangle', 'square', 'hexagon']

interface Node {
  // scattered starting position (normalized 0..1 of canvas size)
  sx: number
  sy: number
  // assembled target position (normalized), forming a diagram layout
  tx: number
  ty: number
  size: number
  kind: ShapeKind
  colorIdx: number
  rotation: number
  rotationSpeed: number
  // per-node phase offset so the drift isn't perfectly synchronized
  phase: number
}

interface DiagramShapesProps {
  className?: string
  /** 0 (light/Monad) or 1 (dark/Dala) palette selector. */
  theme: 'light' | 'dark'
}

const LIGHT_COLORS = ['#1a6b8a', '#d4634a', '#5ba88c', '#e9a23b']
const DARK_COLORS = ['#3ba4c7', '#e8876f', '#5bb896', '#f0b84a']

const NODE_COUNT = 46
const CONNECT_DISTANCE = 0.22 // normalized distance threshold for drawing a line
const MAX_CONNECTIONS_PER_NODE = 3

function rand(seed: number) {
  const x = Math.sin(seed) * 43758.5453
  return x - Math.floor(x)
}

function buildNodes(): Node[] {
  const nodes: Node[] = []

  // Scattered positions: spread across the whole canvas.
  // Assembled positions: a deliberate diagram layout — a rough
  // hexagonal ring of "satellite" nodes around a horizontal spine of
  // 4 larger hub nodes, echoing "diagram of connected concepts"
  // rather than a random blob once assembled.
  const spineCount = 4
  for (let i = 0; i < NODE_COUNT; i++) {
    const s = i * 7.31
    const sx = rand(s * 1.1)
    const sy = rand(s * 2.3)

    let tx: number
    let ty: number
    if (i < spineCount) {
      // spine nodes, evenly spaced left to right at mid-height
      tx = 0.12 + (i / (spineCount - 1)) * 0.62
      ty = 0.5 + (rand(s * 3.7) - 0.5) * 0.06
    } else {
      // satellite nodes arranged in a loose ring around the spine
      const angle = rand(s * 4.1) * Math.PI * 2
      const radius = 0.16 + rand(s * 5.3) * 0.22
      const anchorIdx = Math.floor(rand(s * 6.1) * spineCount)
      const anchorX = 0.12 + (anchorIdx / (spineCount - 1)) * 0.62
      tx = anchorX + Math.cos(angle) * radius
      ty = 0.5 + Math.sin(angle) * radius * 0.7
    }

    nodes.push({
      sx,
      sy,
      tx: Math.max(0.04, Math.min(0.96, tx)),
      ty: Math.max(0.08, Math.min(0.92, ty)),
      size: 4 + rand(s * 7.9) * 10,
      kind: SHAPE_KINDS[Math.floor(rand(s * 9.1) * SHAPE_KINDS.length)],
      colorIdx: Math.floor(rand(s * 11.3) * 4),
      rotation: rand(s * 13.1) * Math.PI * 2,
      rotationSpeed: (rand(s * 15.7) - 0.5) * 0.006,
      phase: rand(s * 17.3) * Math.PI * 2,
    })
  }
  return nodes
}

function drawShape(
  ctx: CanvasRenderingContext2D,
  kind: ShapeKind,
  x: number,
  y: number,
  size: number,
  rotation: number,
  color: string,
  alpha: number
) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rotation)
  ctx.globalAlpha = alpha
  ctx.strokeStyle = color
  ctx.lineWidth = 1.4
  ctx.fillStyle = color

  switch (kind) {
    case 'circle':
      ctx.beginPath()
      ctx.arc(0, 0, size / 2, 0, Math.PI * 2)
      ctx.globalAlpha = alpha * 0.12
      ctx.fill()
      ctx.globalAlpha = alpha
      ctx.stroke()
      break
    case 'square':
      ctx.beginPath()
      ctx.rect(-size / 2, -size / 2, size, size)
      ctx.globalAlpha = alpha * 0.12
      ctx.fill()
      ctx.globalAlpha = alpha
      ctx.stroke()
      break
    case 'triangle': {
      const h = size * 0.9
      ctx.beginPath()
      ctx.moveTo(0, -h / 1.6)
      ctx.lineTo(h / 1.8, h / 2.2)
      ctx.lineTo(-h / 1.8, h / 2.2)
      ctx.closePath()
      ctx.globalAlpha = alpha * 0.12
      ctx.fill()
      ctx.globalAlpha = alpha
      ctx.stroke()
      break
    }
    case 'hexagon': {
      const r = size / 1.8
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i
        const px = Math.cos(a) * r
        const py = Math.sin(a) * r
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.globalAlpha = alpha * 0.12
      ctx.fill()
      ctx.globalAlpha = alpha
      ctx.stroke()
      break
    }
  }
  ctx.restore()
}

export default function DiagramShapes({ className, theme }: DiagramShapesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const nodesRef = useRef<Node[]>([])
  const scrollProgressRef = useRef(0)
  const pointerRef = useRef({ x: 0.5, y: 0.5 })
  const rafRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (nodesRef.current.length === 0) nodesRef.current = buildNodes()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const colors = theme === 'light' ? LIGHT_COLORS : DARK_COLORS
    const lineColor = theme === 'light' ? 'rgba(43,89,209,' : 'rgba(128,82,255,'

    let width = 0
    let height = 0
    let dpr = 1

    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      width = parent.clientWidth
      height = parent.clientHeight
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const handleScroll = () => {
      // 0 at top of hero, 1 by ~70% of one viewport height scrolled —
      // shapes are fully assembled well before the hero scrolls away.
      const p = Math.min(1, Math.max(0, window.scrollY / (window.innerHeight * 0.7)))
      scrollProgressRef.current = p
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })

    const handlePointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      pointerRef.current = {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
      }
    }
    window.addEventListener('pointermove', handlePointerMove)

    let elapsed = 0
    const animate = () => {
      rafRef.current = requestAnimationFrame(animate)
      elapsed += 0.016

      ctx.clearRect(0, 0, width, height)

      const progress = scrollProgressRef.current
      // ease the assembly so it doesn't feel linear/mechanical
      const eased = progress * progress * (3 - 2 * progress)

      const nodes = nodesRef.current
      const positions: { x: number; y: number }[] = []

      for (const node of nodes) {
        // Interpolate between scattered and assembled position.
        const baseX = node.sx + (node.tx - node.sx) * eased
        const baseY = node.sy + (node.ty - node.sy) * eased

        // Gentle idle drift + a small parallax pull toward the cursor,
        // strongest for scattered shapes, minimal once assembled (a
        // settled diagram shouldn't wobble much).
        const driftAmount = 0.012 * (1 - eased * 0.7)
        const driftX = Math.sin(elapsed * 0.4 + node.phase) * driftAmount
        const driftY = Math.cos(elapsed * 0.35 + node.phase) * driftAmount

        const pointerPull = 0.04 * (1 - eased)
        const px = baseX + (pointerRef.current.x - 0.5) * pointerPull + driftX
        const py = baseY + (pointerRef.current.y - 0.5) * pointerPull + driftY

        positions.push({ x: px * width, y: py * height })
      }

      // Connecting lines — only meaningful once mostly assembled, fade
      // in as the diagram forms rather than appearing/disappearing
      // abruptly.
      const lineAlpha = Math.max(0, eased - 0.35) / 0.65
      if (lineAlpha > 0.01) {
        for (let i = 0; i < nodes.length; i++) {
          const candidates: { j: number; dist: number }[] = []
          for (let j = i + 1; j < nodes.length; j++) {
            const dx = nodes[i].tx - nodes[j].tx
            const dy = nodes[i].ty - nodes[j].ty
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < CONNECT_DISTANCE) candidates.push({ j, dist })
          }
          candidates.sort((a, b) => a.dist - b.dist)
          for (const { j, dist } of candidates.slice(0, MAX_CONNECTIONS_PER_NODE)) {
            const a = positions[i]
            const b = positions[j]
            const strength = (1 - dist / CONNECT_DISTANCE) * lineAlpha * 0.5
            ctx.strokeStyle = `${lineColor}${strength.toFixed(3)})`
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }

      // Shapes themselves — slightly more opaque once assembled so the
      // final diagram reads clearly, softer/more scattered-looking
      // pre-scroll.
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i]
        const pos = positions[i]
        const alpha = 0.28 + eased * 0.4
        const rotation = node.rotation + elapsed * node.rotationSpeed
        drawShape(ctx, node.kind, pos.x, pos.y, node.size, rotation, colors[node.colorIdx], alpha)
      }
    }
    rafRef.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('pointermove', handlePointerMove)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [theme])

  return <canvas ref={canvasRef} className={className} aria-hidden />
}
