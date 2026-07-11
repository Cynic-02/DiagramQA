'use client'

import * as React from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon, Layers, Sparkles, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * ThemeToggle — Multi-theme dropdown selector.
 * Allows switching between Creative (Monad/Dala) and Structured Minimal (Light/Dark) themes.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    setMounted(true)
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!mounted) {
    return (
      <div className={cn('h-8 w-32 rounded-full border border-border/40 bg-muted/30 animate-pulse', className)} />
    )
  }

  const THEMES = [
    { id: 'dark', label: '🌌 Dala (Dark)', short: 'Dala Dark' },
    { id: 'light', label: '☀️ Monad (Light)', short: 'Monad Light' },
    { id: 'minimal-dark', label: '🔳 Minimal Dark', short: 'Minimal Dark' },
    { id: 'minimal-light', label: '🔲 Minimal Light', short: 'Minimal Light' },
  ]

  const currentTheme = THEMES.find((t) => t.id === theme) ?? THEMES[0]

  const getIcon = (id: string) => {
    switch (id) {
      case 'dark':
        return <Sparkles className="size-3 text-primary" />
      case 'light':
        return <Sun className="size-3 text-secondary" />
      case 'minimal-dark':
        return <Moon className="size-3 text-muted-foreground" />
      case 'minimal-light':
        return <Sun className="size-3 text-muted-foreground" />
      default:
        return <Layers className="size-3" />
    }
  }

  return (
    <div ref={containerRef} className={cn('relative inline-block', className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-8 items-center gap-2 rounded-full border border-border/60 bg-card/90 px-3 text-[11px] font-bold shadow-sm transition-all hover:bg-muted/50 active:scale-[0.98]"
      >
        {getIcon(theme ?? 'dark')}
        <span>{currentTheme.short}</span>
        <ChevronDown className="size-3 opacity-60" />
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-[120] w-48 rounded-xl border border-border/60 bg-card/95 p-1 shadow-lg backdrop-blur-md flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-2 duration-150">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTheme(t.id)
                setOpen(false)
              }}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[11px] font-semibold transition-all hover:bg-muted/70',
                theme === t.id ? 'bg-primary/10 text-primary' : 'text-foreground/80'
              )}
            >
              {getIcon(t.id)}
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
