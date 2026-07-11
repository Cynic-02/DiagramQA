'use client'

import { usePathname } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

/* ============================================================
   PageTransition — wraps every route so navigating between pages
   fades + scales in, instead of the default hard cut. Keyed on
   pathname so AnimatePresence treats each route as a distinct
   element and animates the swap.
   ============================================================ */

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const reduce = useReducedMotion()

  if (reduce) {
    // Respect prefers-reduced-motion — no animation, just render.
    return <>{children}</>
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.01 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        style={{ minHeight: '100dvh' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
