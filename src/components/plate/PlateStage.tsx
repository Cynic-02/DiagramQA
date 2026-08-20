'use client'

import * as React from 'react'

import { mountPlateStage, type PlateHandle } from '@/lib/plate/engine'

/* ==================================================================
   THE PLATE STAGE

   Layer 0 of the homepage. Eight self-drawing plates share one fixed
   inventory of ink; scroll tells that ink which diagram to become and
   it travels across the page to get there.

   The component is a shell. It mounts the engine once, hands the page
   a ref to drive the annotation presence dial, and never re-renders —
   scrolling writes to the engine directly, not through React.
   ================================================================== */
export default function PlateStage({
  className,
  handleRef,
  onScene,
}: {
  className?: string
  /** Filled with the live engine handle once mounted. */
  handleRef?: React.MutableRefObject<PlateHandle | null>
  onScene?: (index: number, name: string, progress: number) => void
}) {
  const hostRef = React.useRef<HTMLDivElement | null>(null)
  const cbRef = React.useRef(onScene)
  cbRef.current = onScene

  React.useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let handle: PlateHandle | null = null
    try {
      handle = mountPlateStage(host, {
        sectionSelector: '[data-section]',
        onScene: (i, name, p) => cbRef.current?.(i, name, p),
      })
    } catch (err) {
      // A backdrop is never worth a blank page. If the geometry pass
      // fails on some engine, the page renders without it.
      console.warn('[plate] stage unavailable', err)
      return
    }

    if (handleRef) handleRef.current = handle
    return () => {
      handle?.destroy()
      if (handleRef) handleRef.current = null
    }
  }, [])

  return <div ref={hostRef} className={className} aria-hidden />
}
