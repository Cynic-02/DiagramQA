'use client'

/**
 * TiltedCard — a 3D pointer-tilt image card with an optional overlay and
 * tooltip caption. Ported to `framer-motion` (already a project dependency)
 * in place of `motion/react`.
 *
 * Used for the one genuinely photographic/image element in this app: the
 * uploaded source-diagram thumbnail in ExtractionStage.
 */

import { useRef, useState, type ReactNode } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

const springValues = {
  damping: 30,
  stiffness: 100,
  mass: 2,
}

export interface TiltedCardProps {
  imageSrc: string
  altText?: string
  captionText?: string
  containerHeight?: string
  containerWidth?: string
  imageHeight?: string
  imageWidth?: string
  scaleOnHover?: number
  rotateAmplitude?: number
  showMobileWarning?: boolean
  showTooltip?: boolean
  overlayContent?: ReactNode
  displayOverlayContent?: boolean
  className?: string
}

export default function TiltedCard({
  imageSrc,
  altText = 'Tilted card image',
  captionText = '',
  containerHeight = '300px',
  containerWidth = '100%',
  imageHeight = '300px',
  imageWidth = '300px',
  scaleOnHover = 1.1,
  rotateAmplitude = 14,
  showMobileWarning = true,
  showTooltip = true,
  overlayContent = null,
  displayOverlayContent = false,
  className,
}: TiltedCardProps) {
  const ref = useRef<HTMLElement>(null)

  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotateX = useSpring(useMotionValue(0), springValues)
  const rotateY = useSpring(useMotionValue(0), springValues)
  const scale = useSpring(1, springValues)
  const opacity = useSpring(0)
  const rotateFigcaption = useSpring(0, {
    stiffness: 350,
    damping: 30,
    mass: 1,
  })

  const [lastY, setLastY] = useState(0)

  function handleMouse(e: React.MouseEvent<HTMLElement>) {
    if (!ref.current) return

    const rect = ref.current.getBoundingClientRect()
    const offsetX = e.clientX - rect.left - rect.width / 2
    const offsetY = e.clientY - rect.top - rect.height / 2

    const rotationX = (offsetY / (rect.height / 2)) * -rotateAmplitude
    const rotationY = (offsetX / (rect.width / 2)) * rotateAmplitude

    rotateX.set(rotationX)
    rotateY.set(rotationY)

    x.set(e.clientX - rect.left)
    y.set(e.clientY - rect.top)

    const velocityY = offsetY - lastY
    rotateFigcaption.set(-velocityY * 0.6)
    setLastY(offsetY)
  }

  function handleMouseEnter() {
    scale.set(scaleOnHover)
    opacity.set(1)
  }

  function handleMouseLeave() {
    opacity.set(0)
    scale.set(1)
    rotateX.set(0)
    rotateY.set(0)
    rotateFigcaption.set(0)
  }

  return (
    <figure
      ref={ref}
      className={`relative flex h-full w-full flex-col items-center justify-center ${className ?? ''}`}
      style={{
        height: containerHeight,
        width: containerWidth,
        perspective: '800px',
      }}
      onMouseMove={handleMouse}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {showMobileWarning && (
        <div className="absolute top-4 hidden text-center text-sm max-sm:block">
          This effect is not optimized for mobile. Check on desktop.
        </div>
      )}

      <motion.div
        className="relative"
        style={{
          width: imageWidth,
          height: imageHeight,
          rotateX,
          rotateY,
          scale,
          transformStyle: 'preserve-3d',
        }}
      >
        <motion.img
          src={imageSrc}
          alt={altText}
          className="absolute left-0 top-0 border-[3px] border-border object-contain will-change-transform"
          style={{
            width: imageWidth,
            height: imageHeight,
            transform: 'translateZ(0)',
          }}
        />

        {displayOverlayContent && overlayContent && (
          <motion.div
            className="absolute left-0 top-0 z-[2] will-change-transform"
            style={{ transform: 'translateZ(30px)' }}
          >
            {overlayContent}
          </motion.div>
        )}
      </motion.div>

      {showTooltip && (
        <motion.figcaption
          className="pointer-events-none absolute left-0 top-0 z-[3] border-2 border-border bg-foreground px-2.5 py-1 text-[10px] font-bold text-background opacity-0"
          style={{ x, y, opacity, rotate: rotateFigcaption }}
        >
          {captionText}
        </motion.figcaption>
      )}
    </figure>
  )
}
