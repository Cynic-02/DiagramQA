'use client'

import { motion, useReducedMotion } from 'framer-motion'

/**
 * SectionDivider — a geometric SVG transition placed between the 3D hero and
 * the flat console. Reinforces the product's "diagram → knowledge graph"
 * concept: a diagonal sheared plane with a thin animated node-edge motif
 * running across it.
 *
 * Dark-to-console gradient, subtle emerald accent line, optional animated
 * data-flow dot. Purely decorative (aria-hidden).
 */
export function SectionDivider() {
  const reduce = useReducedMotion()
  return (
    <div
      aria-hidden
      className="pointer-events-none relative -mt-px h-16 w-full overflow-hidden bg-background"
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1440 64"
        preserveAspectRatio="none"
      >
        {/* gradient fill from hero darkness into console background */}
        <defs>
          <linearGradient id="divider-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.1 0.012 240)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--background)" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="divider-accent" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="50%" stopColor="oklch(0.82 0.16 165)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>

        <rect width="1440" height="64" fill="url(#divider-fade)" />

        {/* diagonal sheared edge */}
        <path
          d="M0 40 L1440 18 L1440 64 L0 64 Z"
          fill="var(--background)"
        />

        {/* thin emerald accent line along the shear */}
        <path
          d="M0 40 L1440 18"
          stroke="url(#divider-accent)"
          strokeWidth="1.5"
          fill="none"
        />

        {/* small node-edge motif — graph transformation hint */}
        <g stroke="oklch(0.82 0.16 165)" strokeWidth="1" opacity="0.35" fill="none">
          <line x1="180" y1="30" x2="240" y2="22" />
          <line x1="240" y1="22" x2="300" y2="34" />
          <line x1="300" y1="34" x2="360" y2="26" />
        </g>
        <g fill="oklch(0.82 0.16 165)" opacity="0.5">
          <circle cx="180" cy="30" r="2.5" />
          <circle cx="240" cy="22" r="2.5" />
          <circle cx="300" cy="34" r="2.5" />
          <circle cx="360" cy="26" r="2.5" />
        </g>
        <g fill="oklch(0.74 0.19 25)" opacity="0.45">
          <circle cx="1080" cy="30" r="2.5" />
          <circle cx="1140" cy="22" r="2.5" />
          <circle cx="1200" cy="32" r="2.5" />
          <circle cx="1260" cy="24" r="2.5" />
        </g>
        <g stroke="oklch(0.74 0.19 25)" strokeWidth="1" opacity="0.3" fill="none">
          <line x1="1080" y1="30" x2="1140" y2="22" />
          <line x1="1140" y1="22" x2="1200" y2="32" />
          <line x1="1200" y1="32" x2="1260" y2="24" />
        </g>
      </svg>

      {/* animated data-flow dot travelling across the accent line */}
      {!reduce && (
        <motion.div
          className="absolute top-[60%] size-1.5 rounded-full"
          style={{
            background: 'oklch(0.82 0.16 165)',
            boxShadow: '0 0 10px oklch(0.82 0.16 165)',
          }}
          animate={{
            left: ['-5%', '105%'],
            top: ['62%', '34%'],
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      )}
    </div>
  )
}
