'use client'

import * as React from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * ThemeToggle — simple light/dark mode switch (Layer 1 of the
 * Neo-Brutal Aurora two-layer theme system). Palette selection
 * (Layer 2) is a separate control — see PaletteSwitcher.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <div className={cn('size-8 rounded-full border border-border/40 bg-muted/30 animate-pulse', className)} />
    )
  }

  const isDark = resolvedTheme === 'dark'

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={cn(
        'flex size-8 items-center justify-center rounded-full border border-border/60 bg-card/90 shadow-sm transition-all hover:bg-muted/50 active:scale-[0.98]',
        className
      )}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Moon className="size-3.5 text-primary" /> : <Sun className="size-3.5 text-secondary" />}
    </button>
  )
}
