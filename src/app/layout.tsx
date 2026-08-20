import type { Metadata, Viewport } from 'next'
import { Archivo, Instrument_Sans, JetBrains_Mono, Caveat } from 'next/font/google'

import './globals.css'
import './plate.css'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as SonnerToaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/theme-provider'
import { PageTransition } from '@/components/PageTransition'
import { HapticFeedbackInitializer } from '@/components/haptic-feedback-initializer'

/* ==================================================================
   RUBRIC — four families, four files. Down from seven families and
   sixteen weight files loaded on every route.

     Archivo         display    industrial grotesque, true 900
     Instrument Sans text       narrow, contemporary, not Inter
     JetBrains Mono  data       agent ids, labels, stats, code
     Caveat          marginalia MAX ONE INSTANCE PER VIEWPORT

   The marginalia rule is what makes the educational identity work: a
   red-pen note in the margin is what a teacher does. It is a
   signature, not a texture. Handwriting as a body font converts a
   signature into wallpaper and destroys both.
   ================================================================== */

const archivo = Archivo({
  variable: '--font-archivo',
  subsets: ['latin'],
  display: 'swap',
  weight: ['700', '800', '900'],
})

const instrument = Instrument_Sans({
  variable: '--font-instrument',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

const jetbrains = JetBrains_Mono({
  variable: '--font-jetbrains',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '700'],
})

const caveat = Caveat({
  variable: '--font-caveat',
  subsets: ['latin'],
  display: 'swap',
  weight: ['700'],
})

export const metadata: Metadata = {
  metadataBase: new URL('https://diagrammind.app'),
  title: {
    default: 'DiagramMind — turn any diagram into a verified question set',
    template: '%s · DiagramMind',
  },
  description:
    "Upload a diagram. Get questions across all six Bloom levels, each one independently answered and verified by a second agent before you ever see it.",
  keywords: [
    'diagram question generation',
    "Bloom's taxonomy",
    'assessment generation',
    'multi-agent verification',
    'science diagrams',
    'teacher tools',
  ],
  authors: [{ name: 'DiagramMind' }],
  openGraph: {
    type: 'website',
    title: 'DiagramMind — turn any diagram into a verified question set',
    description:
      'Six agents, one pipeline, verified output. Questions across all six Bloom levels from any diagram you already have.',
    siteName: 'DiagramMind',
  },
  icons: {
    icon: '/mark.svg',
    shortcut: '/mark.svg',
    apple: '/logo-mark.png',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#efeae0' },
    { media: '(prefers-color-scheme: dark)', color: '#12100d' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${archivo.variable} ${instrument.variable} ${jetbrains.variable} ${caveat.variable} min-h-screen bg-background text-foreground antialiased`}
      >
        <ThemeProvider>
          {/* Printed-paper grain. The only texture in the system. */}
          <div className="grain-overlay" aria-hidden />
          <HapticFeedbackInitializer />
          <PageTransition>{children}</PageTransition>
          <Toaster />
          <SonnerToaster position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
