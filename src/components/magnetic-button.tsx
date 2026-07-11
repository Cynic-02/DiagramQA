'use client'

import * as React from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import { cn } from '@/lib/utils'

/**
 * MagneticButton — a button that subtly attracts toward the cursor when it's
 * nearby, creating the premium "alive" feel of world-class sites. Falls back
 * to a normal button on touch / reduced-motion.
 *
 * @example
 * <MagneticButton onClick={...}>Begin</MagneticButton>
 */
export const MagneticButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    strength?: number
  }
>(({ children, className, strength = 0.3, onMouseMove, onMouseLeave, ...props }, ref) => {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 200, damping: 15, mass: 0.3 })
  const sy = useSpring(y, { stiffness: 200, damping: 15, mass: 0.3 })

  const [active, setActive] = React.useState(false)

  React.useEffect(() => {
    const isTouch = window.matchMedia('(pointer: coarse)').matches
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!isTouch && !reduce) setActive(true)
  }, [])

  const handleMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    onMouseMove?.(e)
    if (!active) return
    const rect = e.currentTarget.getBoundingClientRect()
    const mx = e.clientX - rect.left - rect.width / 2
    const my = e.clientY - rect.top - rect.height / 2
    x.set(mx * strength)
    y.set(my * strength)
  }

  const handleLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    onMouseLeave?.(e)
    x.set(0)
    y.set(0)
  }

  if (!active) {
    return (
      <button ref={ref} className={className} {...props}>
        {children}
      </button>
    )
  }

  return (
    <motion.button
      ref={ref}
      className={cn('relative', className)}
      style={{ x: sx, y: sy }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      {...(props as React.ComponentProps<typeof motion.button>)}
    >
      {children}
    </motion.button>
  )
})
MagneticButton.displayName = 'MagneticButton'
