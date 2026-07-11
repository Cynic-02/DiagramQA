'use client'

import { useEffect, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion'
import { ArrowRight, CheckCircle2 } from 'lucide-react'

/* ============================================================
   LiveConversionCard — 3D mouse-tilt demo card matching the
   BangLaTeX "live conversion" hero panel: dark glass window with
   chrome dots, an INPUT section, a CONVERTED arrow divider, an
   OUTPUT section with a copy chip, and pagination dots that cycle
   through a few example conversions automatically.

   Colors: this card is deliberately always-dark ("dark terminal"),
   regardless of the site's active Monad/Dala theme. Its accents use the
   Cognitive Atlas dark-register teal + amber pair.
   ============================================================ */

const PRIMARY_RGB = '59,164,199'
const ACCENT_RGB = '240,184,74'
const PRIMARY_HEX = '#3ba4c7'
const ACCENT_HEX = '#f0b84a'

interface DemoItem {
  label: string
  input: string
  output: string
}

const DEMO_ITEMS: DemoItem[] = [
  {
    label: 'Extraction',
    input: 'diagram.png → 8 entities, 11 edges',
    output: '{ "type": "flowchart", "entities": [...] }',
  },
  {
    label: 'Generation',
    input: 'entities + Bloom level: Analyze',
    output: 'Q3: "Why does Parser feed both Graph and QA?"',
  },
  {
    label: 'Verification',
    input: 'Q3 + independent answer',
    output: 'status: pass · correctness: correct',
  },
]

export function LiveConversionCard({ className }: { className?: string }) {
  const [demoIdx, setDemoIdx] = useState(0)

  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const springConfig = { damping: 25, stiffness: 200 }
  const rotateX = useSpring(useTransform(mouseY, [-200, 200], [8, -8]), springConfig)
  const rotateY = useSpring(useTransform(mouseX, [-200, 200], [-8, 8]), springConfig)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    mouseX.set(e.clientX - rect.left - rect.width / 2)
    mouseY.set(e.clientY - rect.top - rect.height / 2)
  }
  const handleMouseLeave = () => {
    mouseX.set(0)
    mouseY.set(0)
  }

  useEffect(() => {
    const timer = setInterval(() => setDemoIdx((i) => (i + 1) % DEMO_ITEMS.length), 3500)
    return () => clearInterval(timer)
  }, [])

  const demo = DEMO_ITEMS[demoIdx]

  return (
    <div className={className} style={{ perspective: 1000 }}>
      <motion.div
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
        }}
        className="relative w-[340px] overflow-hidden rounded-2xl border border-white/10 shadow-[0_30px_70px_rgba(0,0,0,0.65)]"
      >
        <div
          className="relative"
          style={{
            background: 'rgba(10,10,10,0.95)',
            border: 'none',
          }}
        >
          <div
            className="flex items-center gap-2 px-4 py-3"
            style={{
              background: `rgba(${PRIMARY_RGB},0.06)`,
              borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div className="flex gap-1.5">
              <span className="size-1.5 rounded-full bg-rose-500/80" />
              <span className="size-1.5 rounded-full bg-amber-500/80" />
              <span className="size-1.5 rounded-full bg-emerald-500/80" />
            </div>
            <span
              className="flex-1 text-center font-mono text-[9.5px] uppercase tracking-[0.14em]"
              style={{ color: 'rgba(245,240,230,0.65)' }}
            >
              DiagramMind · Live pipeline
            </span>
          </div>

          <div className="px-[18px] pb-3 pt-[18px]">
            <div className="mb-1.5 flex items-center gap-1.5">
              <span
                className="font-mono text-[10px] uppercase tracking-[0.14em]"
                style={{ color: 'rgba(245,240,230,0.45)' }}
              >
                Input
              </span>
              <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.07)' }} />
              <span
                className="font-mono text-[10px] tracking-[0.06em]"
                style={{ color: `rgba(${PRIMARY_RGB},0.8)` }}
              >
                {demo.label}
              </span>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={demoIdx + '-input'}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.32 }}
                className="flex min-h-16 items-center justify-center p-3.5 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.08)' }}
              >
                <span
                  className="text-center text-[13px] leading-relaxed"
                  style={{ color: 'rgba(245,240,230,0.9)', fontFamily: 'var(--font-dala-sans)' }}
                >
                  {demo.input}
                </span>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mb-1 flex items-center gap-2 px-[18px] pb-1 pt-1">
            <div
              className="h-px flex-1"
              style={{ background: `linear-gradient(90deg, transparent, rgba(${PRIMARY_RGB},0.3))` }}
            />
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{ background: `rgba(${PRIMARY_RGB},0.1)`, border: `1.5px solid rgba(${PRIMARY_RGB},0.25)` }}
            >
              <ArrowRight size={10} style={{ color: `rgba(${PRIMARY_RGB},0.8)` }} />
              <span
                className="font-mono text-[10px] uppercase tracking-[0.1em]"
                style={{ color: `rgba(${PRIMARY_RGB},0.8)` }}
              >
                Converted
              </span>
            </div>
            <div
              className="h-px flex-1"
              style={{ background: `linear-gradient(90deg, rgba(${PRIMARY_RGB},0.3), transparent)` }}
            />
          </div>

          <div className="px-[18px] pb-[18px] pt-1">
            <div className="mb-1.5 flex items-center gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: ACCENT_HEX }}>
                Output · JSON
              </span>
              <div className="h-px flex-1" style={{ background: `rgba(${ACCENT_RGB},0.2)` }} />
              <CheckCircle2 size={10} style={{ color: ACCENT_HEX }} />
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={demoIdx + '-output'}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.32, delay: 0.1 }}
                className="relative px-3.5 py-3 rounded-lg"
                style={{ background: `rgba(${ACCENT_RGB},0.04)`, border: `1.5px solid rgba(${ACCENT_RGB},0.15)` }}
              >
                <code
                  className="block text-[11px] leading-relaxed"
                  style={{ color: '#d4956a', fontFamily: 'var(--font-monad-mono)', wordBreak: 'break-all' }}
                >
                  {demo.output}
                </code>
                <div
                  className="absolute right-2 top-1.5 rounded px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.15em] border border-amber-500/20"
                  style={{ background: `rgba(${ACCENT_RGB},0.15)`, color: ACCENT_HEX }}
                >
                  Copy
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="mt-3.5 flex justify-center gap-1.5">
              {DEMO_ITEMS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setDemoIdx(i)}
                  aria-label={`Go to demo ${i + 1}`}
                  className="h-2 cursor-pointer border-none transition-all duration-300"
                  style={{
                    width: i === demoIdx ? 28 : 8,
                    background: i === demoIdx ? PRIMARY_HEX : 'rgba(255,255,255,0.22)',
                    borderRadius: 4,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
