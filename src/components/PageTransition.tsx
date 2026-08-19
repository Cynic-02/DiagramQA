'use client'

import { usePathname } from 'next/navigation'
import * as React from 'react'

/* ==================================================================
   PageTransition — TIER 2, THE WIPE.

   Route changes are revealed by a hard edge sweeping across the page,
   not a fade-and-scale. Brutalist reveal is a wipe.

   Routes under /app are excluded on purpose: the console holds a
   Zustand pipeline store and a live SSE stream, and the previous
   implementation used AnimatePresence mode="wait", which fully
   unmounted that tree on every navigation and intermittently remounted
   it into a broken state. Console routes render directly.

   This replaces framer-motion with two CSS properties.
   ================================================================== */

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isConsole = pathname?.startsWith('/app')
  const [shown, setShown] = React.useState(false)

  React.useEffect(() => {
    if (isConsole) return
    setShown(false)
    const id = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(id)
  }, [pathname, isConsole])

  if (isConsole) return <>{children}</>

  return (
    <div className={shown ? 'wipe wipe-in' : 'wipe'} style={{ minHeight: '100dvh' }}>
      {children}
    </div>
  )
}
