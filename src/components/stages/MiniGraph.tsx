'use client'

import * as React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import type { ExtractionOutput } from '@/lib/types'

const NODE_R = 16
const W = 420
const H = 280
const CX = W / 2
const CY = H / 2

function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * MiniGraph — a lightweight, interactive SVG rendering of diagram structure.
 * 100% theme-variable bound with premium hover highlights.
 */
export function MiniGraph({ extraction }: { extraction: ExtractionOutput }) {
  const reduce = useReducedMotion()
  const [hoveredNode, setHoveredNode] = React.useState<string | null>(null)

  const NODE_PALETTE = React.useMemo(() => [
    'var(--primary)',
    'var(--secondary)',
    'var(--accent)',
    'var(--muted-foreground)',
  ], [])

  const { positions, radius } = React.useMemo(() => {
    const n = extraction.entities.length
    const r = n > 0 ? Math.min(W, H) / 2 - 48 : 0
    const map = new Map<string, { x: number; y: number }>()
    extraction.entities.forEach((e, i) => {
      const angle = n > 0 ? (i / n) * Math.PI * 2 - Math.PI / 2 : 0
      map.set(e.id, {
        x: CX + Math.cos(angle) * r,
        y: CY + Math.sin(angle) * r,
      })
    })
    return { positions: map, radius: r }
  }, [extraction.entities])

  if (extraction.entities.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border/50 text-xs text-muted-foreground">
        No entities extracted.
      </div>
    )
  }

  // Get connected nodes of the hovered node
  const connectedNodeIds = React.useMemo(() => {
    if (!hoveredNode) return new Set<string>()
    const set = new Set<string>([hoveredNode])
    extraction.relationships.forEach((rel) => {
      if (rel.from === hoveredNode) set.add(rel.to)
      if (rel.to === hoveredNode) set.add(rel.from)
    })
    return set
  }, [hoveredNode, extraction.relationships])

  // Silence unused warning when there are no relationships
  void radius

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto max-h-80 w-full overflow-visible"
      role="img"
      aria-label="Extracted entity-relationship graph"
    >
      <defs>
        <marker
          id="mg-arrow"
          markerWidth="6"
          markerHeight="6"
          refX="6"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L6,3 L0,6 Z" fill="var(--border-strong)" />
        </marker>
        <marker
          id="mg-arrow-hover"
          markerWidth="6"
          markerHeight="6"
          refX="6"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L6,3 L0,6 Z" fill="var(--primary)" />
        </marker>
      </defs>

      {/* Edges */}
      {extraction.relationships.map((rel, i) => {
        const from = positions.get(rel.from)
        const to = positions.get(rel.to)
        if (!from || !to) return null

        const dx = to.x - from.x
        const dy = to.y - from.y
        const len = Math.hypot(dx, dy) || 1
        const ux = dx / len
        const uy = dy / len
        const x1 = from.x + ux * NODE_R
        const y1 = from.y + uy * NODE_R
        const x2 = to.x - ux * (NODE_R + 6)
        const y2 = to.y - uy * (NODE_R + 6)
        const mx = (x1 + x2) / 2
        const my = (y1 + y2) / 2
        const d = `M ${x1} ${y1} L ${x2} ${y2}`
        const labelW = Math.max(12, rel.label.length * 4.2)

        const isHovered = hoveredNode && (rel.from === hoveredNode || rel.to === hoveredNode)
        const opacity = hoveredNode ? (isHovered ? 1 : 0.12) : 0.5

        return (
          <g key={`rel-${i}`} className="transition-opacity duration-200" style={{ opacity }}>
            <motion.path
              d={d}
              fill="none"
              stroke={isHovered ? "var(--primary)" : "var(--border-strong)"}
              strokeWidth={isHovered ? 2 : 1.2}
              markerEnd={isHovered ? "url(#mg-arrow-hover)" : "url(#mg-arrow)"}
              initial={reduce ? false : { pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.03, ease: 'easeInOut' }}
            />
            {rel.label && (
              <g className="cursor-default">
                <rect
                  x={mx - labelW / 2}
                  y={my - 6}
                  width={labelW}
                  height={12}
                  rx={3}
                  fill="var(--card)"
                  stroke="var(--border)"
                  strokeWidth={0.5}
                />
                <text
                  x={mx}
                  y={my + 2.5}
                  textAnchor="middle"
                  fontSize={7}
                  fontWeight={500}
                  fill="var(--text-secondary)"
                  fontFamily="var(--font-mono, monospace)"
                >
                  {rel.label}
                </text>
              </g>
            )}
          </g>
        )
      })}

      {/* Nodes */}
      {extraction.entities.map((e, i) => {
        const pos = positions.get(e.id)
        if (!pos) return null
        const color = NODE_PALETTE[hashStr(e.type || 'node') % NODE_PALETTE.length]
        const label = e.label.length > 14 ? e.label.slice(0, 13) + '…' : e.label
        
        const isHovered = hoveredNode === e.id
        const isDimmed = hoveredNode && !connectedNodeIds.has(e.id)
        const opacity = isDimmed ? 0.3 : 1

        return (
          <motion.g
            key={e.id}
            initial={reduce ? false : { opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25, delay: i * 0.03, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: `${pos.x}px ${pos.y}px` }}
            className="cursor-pointer transition-opacity duration-200"
            onMouseEnter={() => setHoveredNode(e.id)}
            onMouseLeave={() => setHoveredNode(null)}
          >
            {/* Pulsing Outer Halo on hover */}
            <motion.circle
              cx={pos.x}
              cy={pos.y}
              r={NODE_R + 6}
              fill="none"
              stroke={color}
              strokeWidth={1}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={isHovered ? { scale: 1.15, opacity: 0.4 } : { scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
            {/* Outer static ring */}
            <circle
              cx={pos.x}
              cy={pos.y}
              r={NODE_R + 4}
              fill="none"
              stroke={color}
              strokeWidth={1}
              opacity={isHovered ? 0.4 : 0.15}
              className="transition-all"
            />
            {/* Center solid node */}
            <circle
              cx={pos.x}
              cy={pos.y}
              r={NODE_R}
              fill={color}
              stroke="var(--background)"
              strokeWidth={1.5}
            />
            {/* Labels */}
            <text
              x={pos.x}
              y={pos.y + NODE_R + 12}
              textAnchor="middle"
              fontSize={8.5}
              fontWeight={isHovered ? 700 : 500}
              fill={isHovered ? "var(--primary)" : "var(--text-primary)"}
              fontFamily="var(--font-sans, sans-serif)"
              className="transition-colors"
            >
              {label}
            </text>
            <text
              x={pos.x}
              y={pos.y + NODE_R + 21}
              textAnchor="middle"
              fontSize={7}
              fill="var(--text-muted)"
              fontFamily="var(--font-mono, monospace)"
            >
              {e.type}
            </text>
          </motion.g>
        )
      })}
    </svg>
  )
}
