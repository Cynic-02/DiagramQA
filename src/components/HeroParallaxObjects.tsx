'use client'

import { useRef } from 'react'
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useScroll,
  useReducedMotion,
} from 'framer-motion'

/* ------------------------------------------------------------------ */
/* Config — edit positions / sizes / depth here                        */
/* ------------------------------------------------------------------ */

interface ParallaxObject {
  src: string
  /** horizontal position, % of viewport width (center of the object) */
  x: string
  /** vertical position, % of hero height (center of the object) */
  y: string
  /** rendered size */
  size: number
  /** depth 0 (far, barely moves) → 1 (near, moves the most) */
  depth: number
  rotation: number
  /** extra opacity for far layers to keep the text dominant */
  opacity: number
  /** gentle perpetual float, amplitude in px */
  floatAmp?: number
  floatDuration?: number
}

/* Available but currently unused (swap any entry's src to try them):
   /images/student.svg, /images/sun-2.svg, /images/solar-system-2.svg,
   /images/food-chain.svg, /images/water-cycle.svg, /images/human.svg
   Excluded on purpose: Teacher.svg (framed slide), Ice-Cream Presentation
   (template slide) — both render as pasted rectangles, not floating art. */
const OBJECTS: ParallaxObject[] = [
  // --- far layer: faint distant vocabulary ---
  { src: '/images/galaxy.svg',          x: '10%', y: '16%', size: 170, depth: 0.12, rotation: -3, opacity: 0.45, floatAmp: 6,  floatDuration: 15 },
  { src: '/images/chemical-bond.svg',   x: '48%', y: '10%', size: 150, depth: 0.18, rotation: 4,  opacity: 0.5,  floatAmp: 7,  floatDuration: 14 },
  { src: '/images/circuit-board.svg',   x: '7%',  y: '82%', size: 230, depth: 0.2,  rotation: -4, opacity: 0.5,  floatAmp: 8,  floatDuration: 16 },
  { src: '/images/water-cycle.svg',     x: '45%', y: '90%', size: 250, depth: 0.22, rotation: 2,  opacity: 0.45, floatAmp: 7,  floatDuration: 17 },
  // --- mid layer ---
  { src: '/images/sun.svg',             x: '89%', y: '10%', size: 140, depth: 0.4,  rotation: 5,  opacity: 0.65, floatAmp: 9,  floatDuration: 12 },
  { src: '/images/solar-system.svg',    x: '5%',  y: '44%', size: 190, depth: 0.45, rotation: -5, opacity: 0.6,  floatAmp: 10, floatDuration: 13 },
  { src: '/images/mitochondria.svg',    x: '80%', y: '88%', size: 190, depth: 0.48, rotation: 3,  opacity: 0.6,  floatAmp: 9,  floatDuration: 12 },
  { src: '/images/biological-neuron.svg', x: '30%', y: '84%', size: 210, depth: 0.52, rotation: -4, opacity: 0.62, floatAmp: 10, floatDuration: 11 },
  // --- near layer ---
  { src: '/images/human.svg',           x: '62%', y: '16%', size: 120, depth: 0.7,  rotation: -3, opacity: 0.8,  floatAmp: 11, floatDuration: 10 },
  { src: '/images/spaceship.svg',       x: '91%', y: '30%', size: 190, depth: 0.72, rotation: 6,  opacity: 0.85, floatAmp: 12, floatDuration: 10 },
  { src: '/images/ai-neuron.svg',       x: '34%', y: '92%', size: 190, depth: 0.75, rotation: -5, opacity: 0.8,  floatAmp: 10, floatDuration: 10 },
  { src: '/images/astronaut.svg',       x: '66%', y: '90%', size: 170, depth: 0.8,  rotation: 4,  opacity: 0.85, floatAmp: 10, floatDuration: 9 },
  { src: '/images/girl-studying.svg',   x: '94%', y: '62%', size: 210, depth: 0.85, rotation: -4, opacity: 0.9,  floatAmp: 11, floatDuration: 9 },
]

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function HeroParallaxObjects() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion() ?? false

  /* -------- mouse parallax (desktop pointer only) -------- */
  const mouseX = useMotionValue(0) // -0.5 … 0.5 across the viewport
  const mouseY = useMotionValue(0)

  const spring = { stiffness: 60, damping: 20, mass: 0.8 }
  const smoothX = useSpring(mouseX, spring)
  const smoothY = useSpring(mouseY, spring)

  const handleMouse = (e: React.MouseEvent) => {
    if (prefersReducedMotion) return
    mouseX.set(e.clientX / window.innerWidth - 0.5)
    mouseY.set(e.clientY / window.innerHeight - 0.5)
  }

  /* -------- scroll parallax -------- */
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  })

  return (
    <div
      ref={sectionRef}
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
      onMouseMove={handleMouse}
    >
      {OBJECTS.map((obj, i) => (
        <ParallaxItem
          key={obj.src}
          obj={obj}
          index={i}
          smoothX={smoothX}
          smoothY={smoothY}
          scrollProgress={scrollYProgress}
          reduced={prefersReducedMotion}
        />
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Single object                                                       */
/* ------------------------------------------------------------------ */

interface ItemProps {
  obj: ParallaxObject
  index: number
  smoothX: ReturnType<typeof useSpring>
  smoothY: ReturnType<typeof useSpring>
  scrollProgress: ReturnType<typeof useScroll>['scrollYProgress']
  reduced: boolean
}

function ParallaxItem({ obj, index, smoothX, smoothY, scrollProgress, reduced }: ItemProps) {
  // depth-scaled translations — near objects travel further
  const range = 60 * obj.depth
  const x = useTransform(smoothX, [-0.5, 0.5], [range, -range])
  const y = useTransform(smoothY, [-0.5, 0.5], [range * 0.6, -range * 0.6])

  // scroll: deeper objects drift up faster as the hero leaves
  const scrollShift = 140 * obj.depth
  const scrollY = useTransform(scrollProgress, [0, 1], [0, -scrollShift])
  const scrollOpacity = useTransform(scrollProgress, [0, 0.7], [1, 0])

  return (
    // Layer 1: CSS centering wrapper (keeps translate out of framer transforms)
    <div
      className="absolute"
      style={{
        left: obj.x,
        top: obj.y,
        width: obj.size,
        height: obj.size,
        transform: 'translate(-50%, -50%)',
        zIndex: Math.round(obj.depth * 10),
      }}
    >
      {/* Layer 2: entrance + mouse parallax */}
      <motion.div
        className="h-full w-full"
        style={{ x, y, opacity: scrollOpacity }}
        initial={reduced ? false : { opacity: 0, scale: 0.85 }}
        animate={{ opacity: obj.opacity, scale: 1 }}
        transition={{
          duration: 1.1,
          delay: 0.15 + index * 0.08,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        {/* Layer 3: scroll drift */}
        <motion.div className="h-full w-full" style={{ y: scrollY }}>
          {/* Layer 4: perpetual float + tilt */}
          <motion.div
            className="h-full w-full"
            style={{ rotate: obj.rotation }}
            animate={
              reduced || !obj.floatAmp
                ? undefined
                : {
                    y: [obj.floatAmp, -obj.floatAmp, obj.floatAmp],
                    transition: {
                      duration: obj.floatDuration ?? 12,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: index * 0.4,
                    },
                  }
            }
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={obj.src}
              alt=""
              draggable={false}
              className="h-full w-full select-none object-contain
                         drop-shadow-[0_12px_24px_rgba(0,0,0,0.08)]"
            />
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  )
}

export default HeroParallaxObjects
