'use client'

import { useEffect } from 'react'

export function HapticFeedbackInitializer() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return

      // Traverse up to find if the clicked element or parent is interactive
      const isInteractive =
        target.closest('button') ||
        target.closest('a') ||
        target.closest('[role="button"]') ||
        target.closest('input') ||
        target.closest('select') ||
        target.closest('textarea') ||
        target.closest('.interactive')

      if (isInteractive && (window as any).Android?.triggerHaptic) {
        // Trigger a crisp 18ms native click vibration
        (window as any).Android.triggerHaptic(18)
      }
    }

    document.addEventListener('click', handleGlobalClick, { capture: true })
    return () => {
      document.removeEventListener('click', handleGlobalClick, { capture: true })
    }
  }, [])

  return null
}
