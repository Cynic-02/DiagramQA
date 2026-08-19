'use client'

import * as React from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Appearance. Light or dark — that is the entire theme system now.
 *
 * This used to be a two-layer control: a mode toggle plus an
 * eleven-palette picker backed by ~600 lines of CSS, a provider and a
 * pre-paint script in <head>. A palette switcher is a confession that
 * the brand has no colour, and it forced every component to survive
 * eleven contexts, so nothing could ever be properly designed. One
 * palette, decided once.
 */
export function AppearanceMenu({ className }: { className?: string }) {
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
        'flex h-8 items-center gap-2 border-2 border-[var(--line)] bg-[var(--card)] px-2.5',
        'font-mono text-[11px] font-bold uppercase tracking-[0.12em]',
        'transition-colors duration-[90ms] hover:bg-[var(--yellow)] hover:text-[#0a0a0a]',
        className
      )}
    >
      {isDark ? <Moon className="size-3.5" aria-hidden /> : <Sun className="size-3.5" aria-hidden />}
      <span className="hidden xl:inline">{mounted ? (isDark ? 'Dark' : 'Light') : 'Theme'}</span>
    </button>
  )
}
