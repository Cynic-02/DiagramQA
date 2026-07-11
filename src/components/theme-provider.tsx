'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'

/**
 * Real theme provider using next-themes.
 * Dark mode is the default, but users can toggle to light.
 * The class is managed on <html> by next-themes (attribute="class").
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  )
}
