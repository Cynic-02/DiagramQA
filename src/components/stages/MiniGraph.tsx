'use client'

/**
 * MiniGraph — a lightweight, deterministic SVG rendering of an
 * ExtractionOutput (entities as nodes, relationships as directed edges).
 *
 * Layout: circular, computed from the entity index (no physics lib).
 * Node fill colour is chosen by hashing the entity `type`.
 * Edges animate their `pathLength` in via framer-motion.
 *
 * Responsive: `viewBox` + `w-full h-auto max-h-80`.
 */

import * as React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import type { ExtractionOutput } from '@/lib/types'

const NODE_PALETTE = [
  'oklch(0.82 0.16 165)', // emerald
  'oklch(0.78 0.17 95)',  // chartreuse / lime
  'oklch(0.78 0.17 55)',  // amber
  'oklch(0.74 0.19 25)',  // coral / red
  'oklch(0.72 0.15 195)', // teal
  'oklch(0.74 0.16 145)', // spring-green
]

function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const NODE_R = 16
const W = 420
const H = 280
const CX = W / 2
const CY = H / 2

export function MiniGraph({ extraction }: { extraction: ExtractionOutput }) {
  const reduce = useReducedMotion()

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

  // Silence unused warning when there are no relationships / single node.
  void radius

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto max-h-80 w-full"
      role="img"
      aria-label="Extracted entity-relationship graph"
    >
      <defs>
        <marker
          id="mg-arrow"
          markerWidth="8"
          markerHeight="8"
          refX="6"
          refY="4"
          orient="auto"
        >
          <path d="M0,0 L8,4 L0,8 Z" fill="oklch(0.62 0.04 240)" />
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
        const x2 = to.x - ux * (NODE_R + 4)
        const y2 = to.y - uy * (NODE_R + 4)
        const mx = (x1 + x2) / 2
        const my = (y1 + y2) / 2
        const d = `M ${x1} ${y1} L ${x2} ${y2}`
        const labelW = Math.max(8, rel.label.length * 3.4)

        return (
          <g key={`rel-${i}`}>
            <motion.path
              d={d}
              fill="none"
              stroke="oklch(0.62 0.04 240)"
              strokeWidth={1.5}
              markerEnd="url(#mg-arrow)"
              initial={reduce ? false : { pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.15 + i * 0.05, ease: 'easeInOut' }}
            />
            {rel.label && (
              <g>
                <rect
                  x={mx - labelW / 2}
                  y={my - 6}
                  width={labelW}
                  height={12}
                  rx={4}
                  fill="oklch(0.16 0.012 240)"
                  opacity={0.85}
                />
                <text
                  x={mx}
                  y={my + 3}
                  textAnchor="middle"
                  fontSize={7}
                  fill="oklch(0.78 0.02 240)"
                  fontFamily="var(--font-geist-mono, monospace)"
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
        return (
          <motion.g
            key={e.id}
            initial={reduce ? false : { opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: `${pos.x}px ${pos.y}px` }}
          >
            <circle
              cx={pos.x}
              cy={pos.y}
              r={NODE_R + 4}
              fill="none"
              stroke={color}
              strokeWidth={1}
              opacity={0.25}
            />
            <circle
              cx={pos.x}
              cy={pos.y}
              r={NODE_R}
              fill={color}
              stroke="oklch(0.13 0.012 240)"
              strokeWidth={2}
            />
            <text
              x={pos.x}
              y={pos.y + NODE_R + 12}
              textAnchor="middle"
              fontSize={9}
              fontWeight={500}
              fill="oklch(0.95 0.004 220)"
              fontFamily="var(--font-geist-sans, sans-serif)"
            >
              {label}
            </text>
            <text
              x={pos.x}
              y={pos.y + NODE_R + 22}
              textAnchor="middle"
              fontSize={7}
              fill="oklch(0.6 0.02 220)"
              fontFamily="var(--font-geist-mono, monospace)"
            >
              {e.type}
            </text>
          </motion.g>
        )
      })}
    </svg>
  )
}
