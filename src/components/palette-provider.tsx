'use client'

import * as React from 'react'
import { useTheme } from 'next-themes'

/**
 * Layer 2 of the Neo-Brutal Aurora two-layer theme system: PALETTE.
 * Within whichever mode (light/dark) is active, the user picks from
 * that mode's own palette set. Each mode remembers its own last-picked
 * palette independently — switching mode never resets the other
 * mode's choice, matching the design spec exactly.
 *
 * Applies `data-palette` on <html> alongside next-themes' `data-theme`,
 * so `[data-theme="X"][data-palette="Y"]` selectors in globals.css can
 * target the exact combination.
 */

export type LightPalette = 'monad' | 'candy_pop' | 'terracotta_earth' | 'cotton_candy' | 'lavender_haze' | 'lattice'
export type DarkPalette = 'sunset_pop' | 'royal_purple' | 'ocean_teal' | 'fire_and_ice' | 'lattice_dim'
export type PaletteKey = LightPalette | DarkPalette

export const LIGHT_PALETTES: LightPalette[] = [
  'monad',
  'candy_pop',
  'terracotta_earth',
  'cotton_candy',
  'lavender_haze',
  'lattice',
]
export const DARK_PALETTES: DarkPalette[] = [
  'sunset_pop',
  'royal_purple',
  'ocean_teal',
  'fire_and_ice',
  'lattice_dim',
]

const DEFAULTS = { light: 'monad' as PaletteKey, dark: 'sunset_pop' as PaletteKey }

/** Human labels + swatch dot color for each palette, used by the
    swatch picker UI — kept separate from the CSS custom properties
    since JS can't read a non-active [data-palette] block's variables. */
export const PALETTE_META: Record<PaletteKey, { label: string; swatch: string }> = {
  monad: { label: 'Monad (Original)', swatch: '#2b59d1' },
  candy_pop: { label: 'Candy Pop', swatch: '#ff5ca8' },
  terracotta_earth: { label: 'Terracotta Earth', swatch: '#c1633b' },
  cotton_candy: { label: 'Cotton Candy', swatch: '#ff9ecb' },
  lavender_haze: { label: 'Lavender Haze', swatch: '#a78bfa' },
  lattice: { label: 'Lattice', swatch: '#2438c8' },
  sunset_pop: { label: 'Sunset Pop', swatch: '#ff6b4a' },
  royal_purple: { label: 'Royal Purple', swatch: '#a855f7' },
  ocean_teal: { label: 'Ocean Teal', swatch: '#00b4a6' },
  fire_and_ice: { label: 'Fire & Ice', swatch: '#00d4ff' },
  lattice_dim: { label: 'Lattice Dim', swatch: '#8ea0ff' },
}

interface PaletteContextValue {
  /** Current mode, mirrored from next-themes (falls back to 'dark' before mount). */
  mode: 'light' | 'dark'
  /** Currently active palette key for the current mode. */
  palette: PaletteKey
  /** This mode's selectable palette keys, in display order. */
  options: PaletteKey[]
  setPalette: (key: PaletteKey) => void
}

const PaletteContext = React.createContext<PaletteContextValue | null>(null)

function storageKey(mode: 'light' | 'dark') {
  return `nba-palette-${mode}`
}

function readStoredPalette(mode: 'light' | 'dark'): PaletteKey {
  if (typeof window === 'undefined') return DEFAULTS[mode]
  const stored = window.localStorage.getItem(storageKey(mode))
  const valid = mode === 'light' ? LIGHT_PALETTES : DARK_PALETTES
  return (valid as string[]).includes(stored || '') ? (stored as PaletteKey) : DEFAULTS[mode]
}

export function PaletteProvider({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme()
  const mode: 'light' | 'dark' = resolvedTheme === 'light' ? 'light' : 'dark'

  const [palette, setPaletteState] = React.useState<PaletteKey>(() => DEFAULTS.dark)
  const [mounted, setMounted] = React.useState(false)

  // On mount, and whenever the mode changes, load that mode's own
  // last-picked palette (independent memory per mode) and apply it.
  React.useEffect(() => {
    const next = readStoredPalette(mode)
    setPaletteState(next)
    document.documentElement.dataset.palette = next
    setMounted(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  const setPalette = React.useCallback(
    (key: PaletteKey) => {
      setPaletteState(key)
      document.documentElement.dataset.palette = key
      window.localStorage.setItem(storageKey(mode), key)
    },
    [mode]
  )

  const options = mode === 'light' ? LIGHT_PALETTES : DARK_PALETTES

  const value = React.useMemo(
    () => ({ mode, palette, options, setPalette }),
    [mode, palette, options, setPalette]
  )

  // Avoid a flash of the wrong palette attribute before the effect above
  // runs on the client (SSR has no localStorage to read).
  if (!mounted) {
    return <div suppressHydrationWarning>{children}</div>
  }

  return <PaletteContext.Provider value={value}>{children}</PaletteContext.Provider>
}

export function usePalette(): PaletteContextValue {
  const ctx = React.useContext(PaletteContext)
  if (!ctx) {
    // Safe fallback for anything rendered before the provider mounts.
    return { mode: 'dark', palette: DEFAULTS.dark, options: DARK_PALETTES, setPalette: () => {} }
  }
  return ctx
}
