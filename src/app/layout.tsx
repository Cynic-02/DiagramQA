import type { Metadata } from "next";
import { Playfair_Display, JetBrains_Mono, Inter, Space_Grotesk, Caveat } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { PaletteProvider } from "@/components/palette-provider";
import { PageTransition } from "@/components/PageTransition";

// Two coherent design systems, one per theme, per explicit direction:
// LIGHT = "Monad" (editorial parchment, serif headlines + mono body).
// DARK  = "Dala" (black-void constellation, single ultra-light sans).
// Both font pairs load together; globals.css switches which one is
// active via the .dark selector, since which fonts apply depends on
// the theme, not a single build-time choice.

// Monad: Untitled Serif substitute — editorial serif, weight 400 only.
const monadSerif = Playfair_Display({
  variable: "--font-monad-serif",
  subsets: ["latin"],
  display: "swap",
  weight: ["400"],
});

// Monad: ABC Diatype Mono substitute — body, nav, buttons, all UI text.
const monadMono = JetBrains_Mono({
  variable: "--font-monad-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
});

// Dala: PPNeueMontreal substitute (per its own style guide) — single
// sans family spanning ultra-light 200 body through 700 display.
const dalaSans = Inter({
  variable: "--font-dala-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["200", "400", "600", "700"],
});

// Legacy variable names kept so components referencing
// var(--font-geist-sans) / var(--font-display) / var(--font-serif)
// don't all need touching — these now alias to the theme-appropriate
// pair via globals.css rather than a single hardcoded family.
const geistSans = monadMono
const geistMono = monadMono
const bricolage = monadSerif
const archivoBlack = dalaSans

// Neo-Brutal Aurora design system: Space Grotesk is the one font used
// everywhere (body, headings, buttons, nav) across every palette/mode.
// Caveat is reserved for a single handwritten accent per screen (a
// kicker/tagline above a hero heading) — never body text or buttons.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  display: "swap",
  weight: ["700"],
});

export const metadata: Metadata = {
  title: "DiagramMind — Diagram Question Generation",
  description:
    "An agentic, retrieval-augmented, diagram-driven pipeline that turns any diagram into a verified question set, conditioned on Bloom's taxonomy.",
  keywords: [
    "DiagramMind",
    "diagram question generation",
    "multi-agent",
    "Bloom's taxonomy",
    "vision AI",
  ],
  authors: [{ name: "DiagramMind" }],
  icons: {
    icon: "/logo-mark.png",
    shortcut: "/logo-mark.png",
    apple: "/logo-mark.png",
  },
};

// CustomCursor / CursorSpotlight intentionally not imported — see the note
// in <body> below. Re-add both imports to restore the pointer effects.
import { HapticFeedbackInitializer } from "@/components/haptic-feedback-initializer";
import { AuroraBlobs } from "@/components/AuroraBlobs";
import { SmoothScrollProvider } from "@/components/SmoothScrollProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${bricolage.variable} ${archivoBlack.variable} ${spaceGrotesk.variable} ${caveat.variable} antialiased bg-background text-foreground min-h-screen`}
      >
        <ThemeProvider>
          <PaletteProvider>
            <SmoothScrollProvider>
              {/* Film grain texture */}
              <div className="grain-overlay" aria-hidden />
              <AuroraBlobs />
              {/*
                CustomCursor and CursorSpotlight removed from the global
                layout — they were the two largest sources of the "laggy"
                feel, and both ran on every page:

                CustomCursor set `cursor: none` and replaced the native
                pointer with a spring-animated div. A JS-drawn cursor is
                always at least one frame behind the real pointer, so the
                lag was literally visible on every mouse movement. It also
                ran el.closest() over a six-selector list on every
                pointermove, unthrottled.

                CursorSpotlight painted a full-viewport radial-gradient
                whose centre updated on pointermove, composited with
                mix-blend-mode: screen. A blend mode over a full-page area
                forces the browser to re-composite the whole stacking
                context, so every mouse movement triggered a full-screen
                repaint plus a full-screen blend.

                The components are kept in the tree; re-mount them here to
                restore the effect.
              */}
              <HapticFeedbackInitializer />
              <PageTransition>{children}</PageTransition>
              <Toaster />
              <SonnerToaster position="bottom-right" />
            </SmoothScrollProvider>
          </PaletteProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
