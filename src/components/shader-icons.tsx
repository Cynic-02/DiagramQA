'use client'

import * as React from 'react'
import { LiquidMetal } from '@paper-design/shaders-react'
import type { LucideIcon } from 'lucide-react'

/* ============================================================
   Shader-driven iconography (paper-design/shaders-react).

   ShaderLogo   — Heatmap effect, reserved for the main hexagon
                  brand mark (sidebar, header).
   ShaderIcon   — LiquidMetal effect, for general small icons
                  (stage icons, agent icons, status glyphs).

   Both work by rendering the target icon to an off-screen SVG,
   serializing it to a data: URL, and passing that as the shader's
   `image` mask — so any Lucide icon can be used without needing a
   pre-exported static asset file.
   ============================================================ */

/**
 * Renders a Lucide icon component to a transparent-background SVG data
 * URL. `hostRef` must be attached to the element wrapping the actual
 * off-screen <Icon /> render so this hook can read its generated <svg>.
 */
function useIconDataUrl(
  hostRef: React.RefObject<HTMLDivElement | null>,
  deps: React.DependencyList,
  size = 64
): string | null {
  const [url, setUrl] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!hostRef.current) return
    const svg = hostRef.current.querySelector('svg')
    if (!svg) return
    const clone = svg.cloneNode(true) as SVGElement
    clone.setAttribute('width', String(size))
    clone.setAttribute('height', String(size))
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    // Lucide icons default to currentColor/stroke — force solid white fill
    // so the shader mask reads the shape cleanly regardless of theme.
    clone.querySelectorAll('path, circle, rect, polygon, line').forEach((el) => {
      el.setAttribute('stroke', 'white')
      el.setAttribute('fill', el.getAttribute('fill') === 'none' ? 'none' : 'white')
    })
    const serialized = new XMLSerializer().serializeToString(clone)
    const dataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(serialized)))}`
    setUrl(dataUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return url
}

interface ShaderIconProps {
  icon: LucideIcon
  size?: number
  className?: string
  /** LiquidMetal shape when no custom colors are needed; premium chrome look. */
  colorBack?: string
  colorTint?: string
  speed?: number
}

/**
 * A small Lucide icon rendered with a LiquidMetal chrome shader instead of
 * a flat color. Use for stage icons, agent icons, and other small
 * iconography that should read as premium/futuristic rather than flat.
 */
export function ShaderIcon({
  icon,
  size = 24,
  className,
  colorBack = 'transparent',
  colorTint = '#e9a23b',
  speed = 0.6,
}: ShaderIconProps) {
  const Icon = icon
  const hostRef = React.useRef<HTMLDivElement | null>(null)
  const dataUrl = useIconDataUrl(hostRef, [Icon, size], size * 3)

  return (
    <span
      className={className}
      style={{ width: size, height: size, display: 'inline-block', position: 'relative' }}
    >
      {/* off-screen source icon used to build the mask */}
      <div
        ref={hostRef}
        style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
        aria-hidden
      >
        <Icon size={size * 3} />
      </div>
      {dataUrl ? (
        <LiquidMetal
          width={size}
          height={size}
          image={dataUrl}
          colorBack={colorBack}
          colorTint={colorTint}
          shape="none"
          repetition={2}
          softness={0.25}
          shiftRed={0.15}
          shiftBlue={0.2}
          distortion={0.04}
          contour={0.3}
          angle={70}
          speed={speed}
          scale={1}
          fit="contain"
        />
      ) : (
        <Icon size={size} className="text-current" />
      )}
    </span>
  )
}

interface ShaderLogoProps {
  size?: number
  className?: string
}

/**
 * The main brand mark. Rendered as a plain flat image — no shader glow,
 * no border box — consistent with the flat neo-brutalist system used
 * everywhere else on the site.
 * Source: /public/logo-mark.png (transparent background, user-provided).
 */
export function ShaderLogo({ size = 28, className }: ShaderLogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-mark.png"
      alt="DiagramMind logo"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, objectFit: 'contain', display: 'inline-block' }}
    />
  )
}
