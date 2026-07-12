'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'

/**
 * Layer 1 of the Neo-Brutal Aurora two-layer theme system: MODE
 * (light/dark), managed by next-themes via a `data-theme` attribute on
 * <html> — not a class — so it composes with Layer 2's `data-palette`
 * attribute (see palette-provider.tsx) in CSS selectors like
 * `[data-theme="dark"][data-palette="royal_purple"]`.
 *
 * Follows the OS's prefers-color-scheme on first visit (enableSystem),
 * overridable via the mode toggle, same as the design spec requires.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="system"
      themes={['light', 'dark']}
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  )
}
