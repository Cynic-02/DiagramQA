'use client'

import { usePathname } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

/* ============================================================
   PageTransition — wraps every route so navigating between pages
   fades + scales in, instead of the default hard cut. Keyed on
   pathname so AnimatePresence treats each route as a distinct
   element and animates the swap.

   IMPORTANT: routes under /app are intentionally excluded from the
   AnimatePresence unmount/remount cycle. mode="wait" fully unmounts
   the previous route's component tree before mounting the next one
   — fine for stateless marketing/auth pages, but /app holds a
   Zustand pipeline store, a live SSE stream connection
   (usePipelineStream), and Three.js canvases that are not designed
   to be torn down and recreated on every navigation. Doing so
   produced an intermittent bug where navigating back to /app showed
   a nearly-blank page (one stray element rendered, the rest of the
   tree silently failed to remount in a consistent state). Console
   routes render directly, no transition wrapper, no unmount risk.
   ============================================================ */

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const reduce = useReducedMotion()

  const isConsoleRoute = pathname?.startsWith('/app')

  if (reduce || isConsoleRoute) {
    // Respect prefers-reduced-motion, and never wrap /app in a
    // remount-on-navigate transition — see note above.
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
