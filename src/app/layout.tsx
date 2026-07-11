import type { Metadata } from "next";
import { Playfair_Display, JetBrains_Mono, Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
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

import { CustomCursor } from "@/components/custom-cursor";
import { CursorSpotlight } from "@/components/cursor-spotlight";
import { HapticFeedbackInitializer } from "@/components/haptic-feedback-initializer";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${bricolage.variable} ${archivoBlack.variable} antialiased bg-background text-foreground min-h-screen`}
      >
        <ThemeProvider>
          {/* Film grain texture */}
          <div className="grain-overlay" aria-hidden />
          <CustomCursor />
          <CursorSpotlight />
          <HapticFeedbackInitializer />
          <PageTransition>{children}</PageTransition>
          <Toaster />
          <SonnerToaster position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
