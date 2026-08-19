'use client'

import * as React from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import { cn } from '@/lib/utils'

/**
 * Lens — magnify part of an image in place.
 *
 * This replaces the pointer-tilt card that used to sit on the diagram
 * previews. That one scaled the whole image to 1.6x on hover, which is
 * why it burst out of its frame. A lens masks a zoomed copy to a circle
 * *inside* the container, so the magnification is bounded by the box no
 * matter how far you zoom.
 *
 * Defaults are tuned for diagrams rather than product shots: a much
 * larger aperture, because a 170px circle over a flowchart shows you one
 * node and no context.
 */
interface LensProps {
  children: React.ReactNode
  /** magnification inside the aperture */
  zoomFactor?: number
  /** aperture diameter in px */
  lensSize?: number
  /** render a fixed lens at `position` instead of following the pointer */
  isStatic?: boolean
  position?: { x: number; y: number }
  hovering?: boolean
  setHovering?: (hovering: boolean) => void
  className?: string
}

export function Lens({
  children,
  zoomFactor = 2,
  lensSize = 320,
  isStatic = false,
  position = { x: 200, y: 150 },
  hovering,
  setHovering,
  className,
}: LensProps) {
  const [localHovering, setLocalHovering] = React.useState(false)
  const isHovering = hovering !== undefined ? hovering : localHovering
  const setIsHovering = setHovering ?? setLocalHovering

  const [mouse, setMouse] = React.useState({ x: 100, y: 100 })
  const [enabled, setEnabled] = React.useState(false)

  // Coarse pointers have no hover, and reduced-motion users should not be
  // handed a magnifier that tracks the cursor.
  React.useEffect(() => {
    setEnabled(
      window.matchMedia('(pointer: fine)').matches &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
  }, [])

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    setMouse({ x: e.clientX - r.left, y: e.clientY - r.top })
  }

  const aperture = (x: number, y: number) =>
    `radial-gradient(circle ${lensSize / 2}px at ${x}px ${y}px, black 100%, transparent 100%)`

  const show = isStatic || (enabled && isHovering)
  const px = isStatic ? position.x : mouse.x
  const py = isStatic ? position.y : mouse.y

  return (
    <div
      className={cn('relative z-20 overflow-hidden', enabled && 'cursor-zoom-in', className)}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onMouseMove={onMove}
    >
      {children}

      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, scale: 0.58 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 overflow-hidden"
            style={{
              maskImage: aperture(px, py),
              WebkitMaskImage: aperture(px, py),
              transformOrigin: `${px}px ${py}px`,
              zIndex: 50,
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                transform: `scale(${zoomFactor})`,
                transformOrigin: `${px}px ${py}px`,
              }}
            >
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Lens
