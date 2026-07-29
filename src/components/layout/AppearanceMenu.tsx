'use client'

import * as React from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon, Check, Palette } from 'lucide-react'
import { usePalette, PALETTE_META } from '@/components/palette-provider'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

/**
 * Appearance menu — one control for both layers of the theme system.
 *
 * Replaces the old arrangement, where a ThemeToggle and a six-dot
 * PaletteSwitcher sat loose in the top bar. That put seven controls in
 * the header for something used maybe twice a session, and the bare
 * swatches were unlabelled — two blues were effectively indistinguishable
 * at 16px. Here each palette is a named row, so the picker is readable
 * rather than guessable, and the header spends a single slot.
 */
export function AppearanceMenu({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const { palette, options, setPalette } = usePalette()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => setMounted(true), [])

  const current = mounted ? PALETTE_META[palette] : null

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn('h-8 gap-2 px-2', className)}
          aria-label="Appearance settings"
        >
          {current ? (
            <span
              className="size-3.5 rounded-full border border-border/60"
              style={{ backgroundColor: current.swatch }}
              aria-hidden
            />
          ) : (
            <Palette className="size-3.5" aria-hidden />
          )}
          <span className="hidden text-xs xl:inline">Theme</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-60 p-3">
        {/* ---- Mode ---- */}
        <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Mode
        </p>
        <div
          className="mb-4 grid grid-cols-2 gap-1 rounded-md border border-border/60 bg-muted/40 p-1"
          role="radiogroup"
          aria-label="Colour mode"
        >
          {(['light', 'dark'] as const).map((m) => {
            const active = mounted && resolvedTheme === m
            return (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setTheme(m)}
                className={cn(
                  'flex items-center justify-center gap-1.5 rounded px-2 py-1.5 text-xs font-semibold capitalize transition-colors',
                  active
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {m === 'light' ? (
                  <Sun className="size-3.5" aria-hidden />
                ) : (
                  <Moon className="size-3.5" aria-hidden />
                )}
                {m}
              </button>
            )
          })}
        </div>

        {/* ---- Palette ---- */}
        <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Palette
        </p>
        <div className="grid gap-0.5" role="radiogroup" aria-label="Colour palette">
          {options.map((key) => {
            const meta = PALETTE_META[key]
            const active = key === palette
            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setPalette(key)}
                className={cn(
                  'flex items-center gap-2.5 rounded px-2 py-1.5 text-left text-xs transition-colors',
                  active
                    ? 'bg-muted font-semibold text-foreground'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}
              >
                <span
                  className="size-3.5 shrink-0 rounded-full border border-border/60"
                  style={{ backgroundColor: meta.swatch }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate">{meta.label}</span>
                {active && <Check className="size-3.5 shrink-0" aria-hidden />}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
