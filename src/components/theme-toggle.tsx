'use client'

import * as React from 'react'
import { useTheme } from 'next-themes'
import { motion, AnimatePresence } from 'framer-motion'
import { Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * ThemeToggle — animated sun/moon toggle with a spring-physics sliding knob.
 * Renders a neutral placeholder until mounted (avoids hydration mismatch).
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => setMounted(true), [])

  const current = mounted ? (resolvedTheme || theme) : 'dark'
  const isDark = current === 'dark'

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={cn(
        'relative inline-flex h-8 w-14 items-center border-[3px] border-border transition-colors',
        isDark ? 'bg-card' : 'bg-primary',
        className
      )}
    >
      {/* Track icons */}
      <Sun
        className={cn(
          'absolute left-1.5 size-3.5 transition-opacity',
          isDark ? 'opacity-30' : 'opacity-100 text-foreground'
        )}
      />
      <Moon
        className={cn(
          'absolute right-1.5 size-3.5 transition-opacity',
          isDark ? 'opacity-100 text-foreground' : 'opacity-30'
        )}
      />
      {/* Sliding knob — flat square, hard border, no gradient */}
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        className={cn(
          'relative z-10 flex size-6 items-center justify-center border-2 border-border',
          isDark ? 'ml-auto mr-0.5 bg-accent' : 'ml-0.5 mr-auto bg-background'
        )}
      >
        <AnimatePresence mode="wait">
          {isDark ? (
            <motion.span
              key="moon"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Moon className="size-3 text-accent-foreground" />
            </motion.span>
          ) : (
            <motion.span
              key="sun"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Sun className="size-3 text-foreground" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
    </button>
  )
}
