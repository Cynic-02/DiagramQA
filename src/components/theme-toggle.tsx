'use client'

import * as React from 'react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'

/**
 * Light / dark. That is the whole theme system now — the eleven-palette
 * switcher is gone. A palette picker on a marketing page is a
 * confession that the brand has no colour, and it forced every
 * component to survive eleven contexts, which is why nothing could
 * ever be properly designed.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  const isDark = mounted && resolvedTheme === 'dark'

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={cn(
        'lbl border-2 border-current px-2.5 py-1.5 transition-colors duration-[90ms]',
        'hover:bg-[var(--yellow)] hover:text-[#0a0a0a] hover:border-[#0a0a0a]',
        className
      )}
    >
      {mounted ? (isDark ? 'DARK' : 'LIGHT') : 'THEME'}
    </button>
  )
}
