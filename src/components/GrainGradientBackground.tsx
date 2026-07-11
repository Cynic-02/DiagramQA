'use client'

import { GrainGradient } from '@paper-design/shaders-react'
import { useTheme } from 'next-themes'

/* ============================================================
   GrainGradientBackground — a deliberate soft/animated exception to
   the site's flat neo-brutalist system, same rationale as the shader
   logo: one bounded, intentional moment of texture, not a pattern
   applied broadly. Uses the site's Palette A colors (yellow / pink /
   teal / near-black) rather than arbitrary demo colors so it reads
   as "the same brand, one accent surface" rather than a mismatch.

   Renders as an absolutely-positioned canvas meant to sit inside a
   `relative` parent, with real content given z-10 above it and (in
   the consuming component) a scrim if needed for text contrast.
   ============================================================ */

const DARK_COLORS = ['#ffd500', '#ff5470', '#00c2a8', '#0a0a0a']
const LIGHT_COLORS = ['#ffd500', '#ff5470', '#00c2a8', '#fff8e6']

export function GrainGradientBackground({
  className,
  fixed = false,
}: {
  className?: string
  /** Render as a fixed full-viewport layer (site-wide background) instead
   *  of absolutely positioned within a relative parent (bounded card use). */
  fixed?: boolean
}) {
  const { resolvedTheme } = useTheme()
  const colors = resolvedTheme === 'light' ? LIGHT_COLORS : DARK_COLORS
  const colorBack = resolvedTheme === 'light' ? '#fff8e6' : '#0a0a0a'

  return (
    <div
      className={className ?? (fixed ? 'fixed inset-0 z-[-1]' : 'absolute inset-0')}
      aria-hidden
    >
      <GrainGradient
        width="100%"
        height="100%"
        colors={colors}
        colorBack={colorBack}
        softness={0.55}
        intensity={0.45}
        noise={0.3}
        shape="corners"
        speed={0.4}
        fit="cover"
      />
    </div>
  )
}
