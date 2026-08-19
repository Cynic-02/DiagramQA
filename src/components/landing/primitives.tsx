'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

/* ==================================================================
   RUBRIC primitives.

   Seven structure rules, four motion tiers. If a component obeys them
   it belongs in the system; if it does not, it does not ship.
   ================================================================== */

/* ------------------------------------------------------------------
   TIER 2 — THE WIPE. Section entrance is a hard edge sweeping across
   the content, never a fade. One CSS property, and it is the reveal
   nobody else is using.
   ------------------------------------------------------------------ */
export function Wipe({
  children,
  className,
  delay = 0,
  as: As = 'div',
}: {
  children: React.ReactNode
  className?: string
  delay?: number
  as?: 'div' | 'section' | 'li' | 'article'
}) {
  const ref = React.useRef<HTMLElement | null>(null)
  const [shown, setShown] = React.useState(false)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(true)
      return
    }
    const io = new IntersectionObserver(
      (es) => {
        if (es[0]?.isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      { threshold: 0.15 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <As
      ref={ref as never}
      className={cn('wipe', shown && 'wipe-in', className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </As>
  )
}

/* ------------------------------------------------------------------
   Buttons. THE PRESS is the only hover on the site: the shadow
   collapses and the element translates by exactly the offset, so it
   presses into the page. 90ms, mechanical, no spring.
   ------------------------------------------------------------------ */
export function Btn({
  children,
  variant = 'default',
  className,
  ...props
}: React.ComponentProps<'button'> & { variant?: 'default' | 'primary' | 'ghost' | 'invert' }) {
  return (
    <button
      {...props}
      className={cn(
        'dat inline-flex items-center justify-center gap-2 border-[3px] border-[var(--ink)] px-6 py-3.5',
        'text-xs font-bold uppercase tracking-[0.12em]',
        'transition-[transform,box-shadow] duration-[90ms] ease-[cubic-bezier(.2,0,0,1)]',
        variant === 'primary' &&
          'bg-[var(--red)] text-white shadow-[6px_6px_0_var(--ink)] hover:translate-x-[6px] hover:translate-y-[6px] hover:shadow-none',
        variant === 'default' &&
          'bg-[var(--card)] text-[var(--ink)] shadow-[4px_4px_0_var(--ink)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none',
        variant === 'invert' &&
          'bg-[var(--ink)] text-[var(--background)] shadow-[4px_4px_0_var(--red)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none',
        variant === 'ghost' &&
          'bg-transparent text-[var(--ink)] hover:bg-[var(--yellow)] hover:text-[#0a0a0a]',
        className
      )}
    >
      {children}
    </button>
  )
}

/* ------------------------------------------------------------------
   Rule 5 — everything is labelled. Honest structure is declared
   structure, and it is also how an exam paper works.
   ------------------------------------------------------------------ */
export function Block({
  label,
  meta,
  children,
  className,
  bodyClassName,
  tone = 'surface',
}: {
  label?: string
  meta?: string
  children: React.ReactNode
  className?: string
  bodyClassName?: string
  tone?: 'surface' | 'ink' | 'red'
}) {
  return (
    <div
      className={cn(
        'border-[3px] border-[var(--ink)] shadow-[4px_4px_0_var(--ink)]',
        tone === 'surface' && 'bg-[var(--card)]',
        tone === 'ink' && 'bg-[var(--ink)] text-[var(--background)]',
        tone === 'red' && 'bg-[var(--red)] text-white',
        className
      )}
    >
      {label && (
        <div
          className={cn(
            'flex items-center justify-between gap-3 px-3 py-2',
            tone === 'surface' ? 'bg-[var(--ink)] text-[var(--background)]' : 'bg-black/25'
          )}
        >
          <span className="lbl">{label}</span>
          {meta && <span className="lbl opacity-70">{meta}</span>}
        </div>
      )}
      <div className={cn('p-5', bodyClassName)}>{children}</div>
    </div>
  )
}

/* ------------------------------------------------------------------
   The Bloom Spectrum. Six hard blocks, never an interpolated gradient
   — the single permitted exception to the no-gradient rule, and what
   makes it recognisable.
   ------------------------------------------------------------------ */
export function Spectrum({
  className,
  filled = 6,
  reverse = false,
}: {
  className?: string
  filled?: number
  reverse?: boolean
}) {
  const idx = [1, 2, 3, 4, 5, 6]
  const order = reverse ? [...idx].reverse() : idx
  return (
    <div className={cn('spectrum', className)} aria-hidden>
      {order.map((n, i) => (
        <span
          key={n}
          className={`bloom-${n}`}
          style={{
            opacity: i < filled ? 1 : 0.12,
            transition: 'opacity 90ms cubic-bezier(.2,0,0,1)',
          }}
        />
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------
   THE ODOMETER — digits roll as mechanical strips in tabular mono,
   not a JS number tween. The physical feel is the point.
   ------------------------------------------------------------------ */
export function Odometer({ value, className }: { value: string; className?: string }) {
  const ref = React.useRef<HTMLSpanElement | null>(null)
  const [roll, setRoll] = React.useState(false)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setRoll(true)
      return
    }
    const io = new IntersectionObserver(
      (es) => {
        if (es[0]?.isIntersecting) {
          setRoll(true)
          io.disconnect()
        }
      },
      { threshold: 0.5 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <span ref={ref} className={cn('odo', className)}>
      {value.split('').map((ch, i) => {
        if (!/[0-9]/.test(ch)) return <span key={i}>{ch}</span>
        return (
          <span className="odo-col" key={i}>
            <span
              className="odo-strip"
              style={{
                transform: `translateY(-${roll ? Number(ch) : 0}em)`,
                transitionDelay: `${i * 70}ms`,
              }}
            >
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </span>
          </span>
        )
      })}
    </span>
  )
}

/* ------------------------------------------------------------------
   THE STAMP — education is marking; marking is stamping. Fires on
   verification, login success, and export.
   ------------------------------------------------------------------ */
export function Stamp({ text, hit }: { text: string; hit: boolean }) {
  return (
    <span className={cn('stamp', hit && 'stamp-hit')} aria-hidden>
      {text}
    </span>
  )
}

/* ------------------------------------------------------------------
   Section heading. Every section carries a number, like a printed form.
   ------------------------------------------------------------------ */
export function SectionHead({
  n,
  title,
  tag,
  children,
}: {
  n: string
  title: string
  tag?: string
  children?: React.ReactNode
}) {
  return (
    <div className="pb-8 pt-14 sm:pt-20">
      <div className="flex flex-wrap items-baseline gap-4">
        <span className="lbl bg-[var(--ink)] px-2.5 py-1.5 text-[var(--background)]">{n}</span>
        <h2 className="d-m">{title}</h2>
        {tag && (
          <span className="lbl border-2 border-[var(--ink)] bg-[var(--yellow)] px-2.5 py-1.5 text-[#0a0a0a]">
            {tag}
          </span>
        )}
      </div>
      {children && (
        <p className="mt-5 max-w-[68ch] text-[var(--ink-2)] leading-relaxed">{children}</p>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------
   HAND-DRAWN CONNECTOR.

   Not strictly brutalist — brutalism would butt the boxes together and
   let the shared border do the work. But six hard boxes in a row read
   as a table, not as a pipeline, and the hand-drawn dashed arrow is
   the one place where a human mark says "this flows into that" better
   than a rule can. It is the same red pen as the marginalia, so it
   belongs to the system even though it bends it.

   The wobble is baked into the path, not animated — a drawn line, not
   a jittering one.
   ------------------------------------------------------------------ */
export function HandArrow({
  dir = 'right',
  className,
}: {
  dir?: 'right' | 'down'
  className?: string
}) {
  const horizontal = dir === 'right'
  return (
    <svg
      className={cn(
        'flex-none overflow-visible text-[var(--red)]',
        horizontal ? 'h-6 w-16' : 'h-16 w-6',
        className
      )}
      viewBox={horizontal ? '0 0 64 24' : '0 0 24 64'}
      preserveAspectRatio="none"
      fill="none"
      aria-hidden
    >
      <path
        d={
          horizontal
            ? 'M2 13 C 11 9.5, 19 15.5, 28 11.8 S 43 14.2, 54 12'
            : 'M11 2 C 14.5 11, 8.5 19, 12.2 28 S 9.8 43, 12 54'
        }
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray="6 5"
      />
      {/* the head is two strokes, drawn by hand, not a filled marker */}
      <path
        d={horizontal ? 'M47 6.5 L 55.5 12 L 47 17.5' : 'M6.5 47 L 12 55.5 L 17.5 47'}
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
