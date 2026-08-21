'use client'

/**
 * BloomWheel — an interactive SVG radial wheel selector for Bloom's
 * taxonomy levels.
 *
 * Pure controlled component: the parent supplies `value` and `onChange`.
 * Renders six annular sectors (donut slices) — Remember at 12 o'clock,
 * going clockwise to Create — plus:
 *   - per-segment verb labels rotated tangentially (kept upright on the
 *     bottom half),
 *   - a center readout (level name + verb + colored dot) that crossfades
 *     on selection,
 *   - a spring-animated pointer at the outer edge that rotates to the
 *     selected segment,
 *   - a faint, slowly-rotating dashed ambiance ring (disabled under
 *     `prefers-reduced-motion`).
 *
 * Each segment is keyboard-focusable (`role="radio"`, Enter/Space to
 * select) and exposes a `:focus-visible` stroke for accessibility.
 */

import * as React from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { BLOOM_LEVELS } from '@/lib/types'
import type { BloomLevel } from '@/lib/types'
import { BLOOM_META } from '@/lib/bloom'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/* Geometry                                                            */
/* ------------------------------------------------------------------ */

/* The hub has to hold the longest level name in the taxonomy set at
   display weight — UNDERSTAND, ten characters — so the inner radius is
   sized from that word, not from what looks balanced with the wedges
   empty. It used to be 70, the readout was fixed-pixel HTML floated on
   top, and the moment the wheel was rendered smaller than its authored
   320px the SVG scaled and the text did not: the word ran straight out
   through the hub wall. The readout is now SVG text in the same
   viewBox, so it scales with everything else and cannot overflow at
   any size. */
const SIZE = 320
const CX = SIZE / 2
const CY = SIZE / 2
const OUTER_R = 146
const INNER_R = 86
const SEG = 60 // degrees per segment

/**
 * Convert polar coordinates (angle in degrees, 0 = top / 12 o'clock,
 * clockwise-positive) to cartesian SVG coordinates.
 */
function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const a = (angleDeg * Math.PI) / 180
  return { x: cx + r * Math.sin(a), y: cy - r * Math.cos(a) }
}

/**
 * Build an SVG path `d` for an annular sector ("donut slice") spanning
 * `[startAngle, endAngle]` (degrees, top=0, clockwise) between `innerR`
 * and `outerR`, centered at `(cx, cy)`.
 *
 * SVG arc flags:
 *   - large-arc-flag = 1 iff the arc spans > 180°
 *   - sweep-flag = 1 on the outer arc (clockwise on screen) and 0 on the
 *     inner arc (counter-clockwise, to close the slice back up)
 */
function annularSector(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startAngle: number,
  endAngle: number,
): string {
  const so = polar(cx, cy, outerR, startAngle)
  const eo = polar(cx, cy, outerR, endAngle)
  const si = polar(cx, cy, innerR, endAngle)
  const ei = polar(cx, cy, innerR, startAngle)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  return [
    `M ${so.x.toFixed(3)} ${so.y.toFixed(3)}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${eo.x.toFixed(3)} ${eo.y.toFixed(3)}`,
    `L ${si.x.toFixed(3)} ${si.y.toFixed(3)}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ei.x.toFixed(3)} ${ei.y.toFixed(3)}`,
    'Z',
  ].join(' ')
}

/**
 * Tangential rotation (in SVG degrees, clockwise-positive) for a label
 * placed at the given segment-center angle. Bottom-half segments are
 * flipped by 180° so the verbs stay upright.
 */
function labelRotation(centerAngle: number): number {
  let rot = centerAngle
  if (rot > 90 && rot < 270) rot -= 180
  return rot
}

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export interface BloomWheelProps {
  value: BloomLevel
  onChange: (b: BloomLevel) => void
  className?: string
}

export function BloomWheel({ value, onChange, className }: BloomWheelProps) {
  const reduce = useReducedMotion() ?? false
  const selectedIndex = Math.max(0, BLOOM_LEVELS.indexOf(value))
  const selectedAngle = selectedIndex * SEG
  const selectedMeta = BLOOM_META[value]

  return (
    <div
      className={cn(
        'relative aspect-square w-[320px] max-w-full',
        className,
      )}
    >
      {/* Inline focus-visible style for the SVG segments (kept local so
          we don't have to touch globals.css). */}
      <style>{`
        .bloom-seg { outline: none; }
        .bloom-seg:focus-visible {
          stroke: var(--blue) !important;
          stroke-width: 2.5 !important;
        }
      `}</style>

      <motion.svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="h-full w-full overflow-visible"
        role="radiogroup"
        aria-label="Bloom's taxonomy level"
        initial={reduce ? false : { opacity: 0, scale: 0.82, rotate: -18 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={
          reduce
            ? { duration: 0 }
            : {
                type: 'spring',
                stiffness: 120,
                damping: 16,
                opacity: { duration: 0.3, ease: 'easeOut' },
              }
        }
        style={{ transformOrigin: 'center' }}
      >
        <defs>
          {/* The vignette used to be three hardcoded dark oklch stops, which
              read as a grey smudge on cream paper. It now derives from the
              paper token, so it disappears in light mode and only does its
              job in dark. */}
          <radialGradient id="bloom-bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--muted)" stopOpacity="0.55" />
            <stop offset="72%" stopColor="var(--muted)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--muted)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* soft vignette disc behind the wheel */}
        <circle cx={CX} cy={CY} r={OUTER_R + 30} fill="url(#bloom-bg)" />

        {/* faint, slowly-rotating dashed ambiance ring */}
        <motion.g
          style={{ transformOrigin: `${CX}px ${CY}px`, transformBox: 'view-box' }}
          animate={reduce ? undefined : { rotate: 360 }}
          transition={
            reduce
              ? undefined
              : { duration: 72, repeat: Infinity, ease: 'linear' }
          }
        >
          <circle
            cx={CX}
            cy={CY}
            r={OUTER_R + 14}
            fill="none"
            stroke="var(--line)"
            strokeWidth={1.5}
            strokeDasharray="2 7"
            strokeLinecap="round"
          />
        </motion.g>

        {/* Segments */}
        {BLOOM_LEVELS.map((level, i) => {
          const meta = BLOOM_META[level]
          const startAngle = i * SEG - SEG / 2
          const endAngle = i * SEG + SEG / 2
          const centerAngle = i * SEG
          const d = annularSector(CX, CY, INNER_R, OUTER_R, startAngle, endAngle)
          const selected = i === selectedIndex
          // Every wedge carries its own Bloom Spectrum hue; the unselected
          // ones are mixed back toward the card so the cool→warm ramp stays
          // legible without competing with the selection.
          const fill = selected
            ? meta.hue
            : `color-mix(in srgb, ${meta.hue} 26%, var(--card))`
          const stroke = 'var(--line)'
          const labelPos = polar(
            CX,
            CY,
            (INNER_R + OUTER_R) / 2,
            centerAngle,
          )
          const labelRot = labelRotation(centerAngle)
          return (
            <g key={level}>
              <motion.path
                d={d}
                style={{
                  fill,
                  stroke,
                  strokeWidth: selected ? 3 : 2,
                  transformOrigin: `${CX}px ${CY}px`,
                  transformBox: 'view-box',
                  cursor: 'pointer',
                  transition:
                    'fill 220ms ease, stroke 220ms ease, stroke-width 220ms ease',
                }}
                initial={false}
                animate={{ scale: selected ? 1.035 : 1 }}
                whileHover={reduce ? undefined : { scale: 1.05 }}
                transition={
                  reduce
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 320, damping: 22 }
                }
                tabIndex={0}
                role="radio"
                aria-checked={selected}
                aria-label={`${level} — verb: ${meta.verb}`}
                onClick={() => onChange(level)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onChange(level)
                  }
                }}
                className="bloom-seg"
              />
              {/* verb label, tangential to the arc */}
              <text
                x={labelPos.x}
                y={labelPos.y}
                fill={selected ? meta.fg : 'var(--ink-2)'}
                fontSize={11.5}
                fontFamily="var(--font-jetbrains), ui-monospace, monospace"
                textAnchor="middle"
                dominantBaseline="middle"
                transform={`rotate(${labelRot} ${labelPos.x} ${labelPos.y})`}
                style={{ pointerEvents: 'none', letterSpacing: '0.1em', fontWeight: 700 }}
              >
                {meta.verb}
              </text>
            </g>
          )
        })}

        {/* inner hub ring — visual frame around the center readout */}
        <circle
          cx={CX}
          cy={CY}
          r={INNER_R - 4}
          fill="var(--card)"
          stroke="var(--line)"
          strokeWidth={2.5}
        />

        {/* ---- the centre readout, in the viewBox ---- */}
        <AnimatePresence mode="wait">
          <motion.g
            key={value}
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <circle
              cx={CX}
              cy={CY - 34}
              r={5}
              fill={selectedMeta.hue}
              stroke="var(--line)"
              strokeWidth={2}
            />
            {/* textLength + lengthAdjust is the guarantee: however long
                the level name is, it is drawn to exactly this width. */}
            <text
              x={CX}
              y={CY + 4}
              textAnchor="middle"
              dominantBaseline="middle"
              fontFamily="var(--font-archivo), 'Arial Black', sans-serif"
              fontWeight={900}
              fontSize={20}
              letterSpacing="-0.5"
              fill="var(--foreground)"
              textLength={Math.min(2 * (INNER_R - 16), value.length * 13)}
              lengthAdjust="spacingAndGlyphs"
              style={{ textTransform: 'uppercase' }}
            >
              {value.toUpperCase()}
            </text>
            <text
              x={CX}
              y={CY + 32}
              textAnchor="middle"
              dominantBaseline="middle"
              fontFamily="var(--font-jetbrains), ui-monospace, monospace"
              fontSize={10}
              fontWeight={700}
              letterSpacing="1.9"
              fill="var(--ink-2)"
            >
              {selectedMeta.verb.toUpperCase()}
            </text>
          </motion.g>
        </AnimatePresence>

        {/* pointer indicator — starts at 12 o'clock and spring-rotates
            to the selected segment's center angle */}
        <motion.g
          style={{ transformOrigin: `${CX}px ${CY}px`, transformBox: 'view-box' }}
          initial={false}
          animate={{ rotate: selectedAngle }}
          transition={
            reduce
              ? { duration: 0 }
              : { type: 'spring', stiffness: 180, damping: 18 }
          }
        >
          <polygon
            points={`${CX},${CY - OUTER_R - 2} ${CX - 6},${CY - OUTER_R - 16} ${CX + 6},${CY - OUTER_R - 16}`}
            fill={selectedMeta.hue}
            stroke="var(--border)"
            strokeWidth={2}
          />
        </motion.g>
      </motion.svg>

    </div>
  )
}
