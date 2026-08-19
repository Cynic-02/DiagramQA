'use client'

import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Iconography, flattened.
 *
 * This file used to render every small console icon through a
 * LiquidMetal chrome shader from @paper-design/shaders-react: each icon
 * was serialised to an SVG data URL, uploaded as a shader mask, and
 * animated — a WebGL pass per icon, for an icon. It was also three
 * system violations at once (simulated depth, a gradient, and a glow).
 *
 * RUBRIC draws icons as icons. The exported API is unchanged so the
 * four call sites did not need touching; the shader-specific props are
 * accepted and ignored.
 */

interface ShaderIconProps {
  icon: LucideIcon
  size?: number
  className?: string
  /** accepted for API compatibility, ignored — colour comes from the token */
  colorBack?: string
  colorTint?: string
  speed?: number
}

export function ShaderIcon({ icon, size = 24, className }: ShaderIconProps) {
  const Icon = icon
  return (
    <Icon
      width={size}
      height={size}
      strokeWidth={2.25}
      className={cn('shrink-0 text-[var(--ink)]', className)}
      aria-hidden
    />
  )
}

interface ShaderLogoProps {
  size?: number
  className?: string
}

/**
 * The mark: the Bloom spectrum in a hard ink frame. Six cognitive
 * levels, cool to warm — brand, information design and pedagogy in one
 * object, at any size, for six rects and no JavaScript.
 */
export function ShaderLogo({ size = 28, className }: ShaderLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={cn('shrink-0', className)}
      aria-hidden
    >
      <rect x="3" y="3" width="42" height="7" fill="var(--bloom-1)" />
      <rect x="3" y="11" width="42" height="7" fill="var(--bloom-2)" />
      <rect x="3" y="19" width="42" height="7" fill="var(--bloom-3)" />
      <rect x="3" y="27" width="42" height="7" fill="var(--bloom-4)" />
      <rect x="3" y="35" width="42" height="4" fill="var(--bloom-5)" />
      <rect x="3" y="40" width="42" height="5" fill="var(--bloom-6)" />
      <rect x="3" y="3" width="42" height="42" fill="none" stroke="var(--ink)" strokeWidth="3" />
    </svg>
  )
}
