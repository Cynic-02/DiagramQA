'use client'

import { useRef } from 'react'
import { useTheme } from 'next-themes'
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from 'framer-motion'
import { ArrowDown } from 'lucide-react'

import BlurText from '@/components/reactbits/BlurText'
import RotatingText from '@/components/reactbits/RotatingText'
import DecryptedText from '@/components/reactbits/DecryptedText'
import { ShaderLogo } from '@/components/shader-icons'
import { LiveConversionCard } from '@/components/LiveConversionCard'
import DiagramShapes3D from '@/components/three/DiagramShapes3D'
import { MagneticButton } from '@/components/magnetic-button'

/* ------------------------------------------------------------------ */
/* Types & constants                                                   */
/* ------------------------------------------------------------------ */

export interface Hero3DProps {
  /** Smooth-scroll trigger — called when the user clicks "Begin". */
  onEnterConsole?: () => void
}

const AGENTS = [
  { name: 'Extraction', color: 'var(--primary)' },
  { name: 'Generation', color: 'var(--accent)' },
  { name: 'Answering', color: 'var(--secondary)' },
  { name: 'Verification', color: 'var(--foreground)' },
] as const

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function Hero3D({ onEnterConsole }: Hero3DProps) {
  const heroRef = useRef<HTMLElement>(null)
  const prefersReducedMotion = useReducedMotion() ?? false
  const { theme, resolvedTheme } = useTheme()

  /* -------------------- Scroll wiring -------------------- */

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })

  const contentOpacity = useTransform(scrollYProgress, [0, 0.45], [1, 0])
  const contentY = useTransform(scrollYProgress, [0, 1], [0, -80])

  /* -------------------- Handlers -------------------- */

  const handleBegin = () => {
    const target = document.getElementById('console')
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      window.scrollBy({ top: window.innerHeight, behavior: 'smooth' })
    }
    onEnterConsole?.()
  }

  /* -------------------- Derived -------------------- */

  const entranceDelay = (d: number) => (prefersReducedMotion ? 0 : d)

  const isMinimal = theme?.startsWith('minimal')

  /* -------------------- Render -------------------- */

  return (
    <section
      ref={heroRef}
      id="hero"
      aria-label="DiagramMind hero"
      className="relative min-h-screen w-full overflow-hidden"
    >
      {!isMinimal && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 75%, rgba(0,0,0,0) 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 75%, rgba(0,0,0,0) 100%)',
          }}
        >
          <DiagramShapes3D theme={resolvedTheme === 'light' ? 'light' : 'dark'} className="h-full w-full" />
        </div>
      )}

      {/* Layer 4: content overlay */}
      <motion.div
        className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-10 sm:px-10 sm:py-14 lg:py-16"
        style={{ opacity: contentOpacity, y: contentY }}
      >
        {/* Brand mark */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: 0.7,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <ShaderLogo size={44} />
        </motion.div>

        {/* Eyebrow tag */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.7,
            delay: entranceDelay(0.05),
            ease: [0.22, 1, 0.36, 1],
          }}
          className="mt-4"
        >
          <span className="hw-panel inline-flex items-center gap-2 rounded-full px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--primary)' }}>
            <span className="thinking-dot inline-flex h-2 w-2 rounded-full" style={{ background: 'var(--primary)' }} />
            {prefersReducedMotion ? (
              'DiagramMind · Multi-agent pipeline'
            ) : (
              <DecryptedText
                text="DiagramMind · Multi-agent pipeline"
                animateOn="view"
                speed={35}
                maxIterations={14}
                sequential
                revealDirection="start"
                useOriginalCharsOnly
              />
            )}
          </span>
        </motion.div>

        {/* Main content */}
        <div className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[1fr_360px]">
          <div className="flex flex-col justify-center">
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.8,
                delay: entranceDelay(0.15),
                ease: [0.22, 1, 0.36, 1],
              }}
              className="max-w-3xl"
            >
              {prefersReducedMotion ? (
                <h1 className="text-balance text-4xl font-black uppercase leading-[0.95] tracking-tight text-foreground sm:text-5xl lg:text-7xl">
                  Turn any diagram into a{' '}
                  <span className="text-secondary">verified question set</span>.
                </h1>
              ) : (
                <BlurText
                  text="Turn any diagram into a verified question set."
                  animateBy="words"
                  direction="top"
                  delay={70}
                  stepDuration={0.4}
                  className="text-balance text-4xl font-black uppercase leading-[0.95] tracking-tight text-foreground sm:text-5xl lg:text-7xl [&_span:nth-last-child(-n+3)]:text-secondary"
                />
              )}
            </motion.div>

            <motion.p
              initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.8,
                delay: entranceDelay(0.3),
                ease: [0.22, 1, 0.36, 1],
              }}
              className="mt-6 flex max-w-xl flex-wrap items-baseline gap-x-1.5 text-balance text-base leading-relaxed text-muted-foreground sm:text-lg"
            >
              <span>
                Upload a{' '}
                {prefersReducedMotion ? (
                  <span className="font-medium text-foreground/90">diagram</span>
                ) : (
                  <RotatingText
                    texts={['diagram', 'architecture', 'ER schema', 'flowchart']}
                    mainClassName="font-medium text-foreground/90"
                    staggerFrom="last"
                    initial={{ y: '100%', opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: '-120%', opacity: 0 }}
                    staggerDuration={0.02}
                    transition={{ type: 'spring', damping: 28, stiffness: 380 }}
                    rotationInterval={2400}
                  />
                )}
                . Four agents — Extraction, Generation, Answering,
                Verification — collaborate to produce Bloom&apos;s-conditioned
                questions you can trust.
              </span>
            </motion.p>

            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.8,
                delay: entranceDelay(0.45),
                ease: [0.22, 1, 0.36, 1],
              }}
              className="mt-8 flex flex-wrap items-center gap-4"
            >
              <MagneticButton
                onClick={handleBegin}
                className="group relative inline-flex h-14 items-center gap-2 rounded-full px-8 text-base font-bold text-white transition-all duration-300 spring-transition hover:scale-105"
                style={{ background: 'var(--primary)', boxShadow: '0 8px 30px rgba(128,82,255,0.2)' }}
              >
                <span>Begin</span>
                <ArrowDown className="size-4 transition-transform duration-200 group-hover:translate-y-1" />
              </MagneticButton>
              <span className="font-mono text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                No sign-up · Local sandbox
              </span>
            </motion.div>

            {/* Agent chips — pipeline-style row with faint connectors */}
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.8,
                delay: entranceDelay(0.6),
                ease: [0.22, 1, 0.36, 1],
              }}
              className="mt-10 flex flex-wrap items-center gap-2"
            >
              <span className="mr-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>
                Agents
              </span>
              {AGENTS.map((idx_a) => (
                <span
                  key={idx_a.name}
                  className="hw-panel relative inline-flex items-center gap-2 rounded-full px-3 py-1.5 transition-transform duration-200 hover:-translate-y-0.5"
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: idx_a.color }}
                  />
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                    {idx_a.name}
                  </span>
                </span>
              ))}
            </motion.div>
          </div>

          {/* Right column — live conversion demo card */}
          <div className="hidden justify-center lg:flex">
            <LiveConversionCard />
          </div>
        </div>

        {/* Footer area — live system status + scroll hint */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: entranceDelay(1) }}
          className="flex flex-col items-center gap-3 pb-1"
        >
          <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70">
            <span className="thinking-dot inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
            <DecryptedText
              text="SYSTEM ONLINE · 4 AGENTS STANDBY"
              animateOn="view"
              speed={35}
              maxIterations={14}
              sequential
              useOriginalCharsOnly={false}
            />
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60">
            Scroll to enter the console ↓
          </span>
        </motion.div>
      </motion.div>
    </section>
  )
}
