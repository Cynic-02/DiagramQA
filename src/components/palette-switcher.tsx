'use client'

import * as React from 'react'
import { usePalette, PALETTE_META } from '@/components/palette-provider'
import { cn } from '@/lib/utils'

/**
 * The Neo-Brutal Aurora palette swatch picker — always visible (per the
 * design spec, "not buried in a settings page"), showing only the 4
 * palettes valid for the CURRENT mode. Switching mode swaps the whole
 * row of options; it never shows light palettes in dark mode or vice
 * versa.
 */
export function PaletteSwitcher({ className }: { className?: string }) {
  const { palette, options, setPalette } = usePalette()

  return (
    <div
      className={cn('palette-picker', className)}
      role="radiogroup"
      aria-label="Color palette"
    >
      {options.map((key) => {
        const meta = PALETTE_META[key]
        const active = key === palette
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={meta.label}
            title={meta.label}
            onClick={() => setPalette(key)}
            className={cn('palette-swatch', active && 'active')}
            style={{ backgroundColor: meta.swatch }}
          />
        )
      })}
    </div>
  )
}
