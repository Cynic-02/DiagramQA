'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'

/**
 * Route-segment error boundary — catches any render/runtime error thrown
 * by a page or component below the root layout (the header, theme
 * provider, cursor effects, etc. all stay intact since only the page
 * content crashed). Without this file, Next.js falls back to its bare
 * default error screen with no recovery path for the user.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[route error boundary]', error)
  }, [error])

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-6 text-center">
      <span
        className="flex size-14 items-center justify-center rounded-full"
        style={{ background: 'color-mix(in srgb, var(--destructive) 15%, transparent)' }}
      >
        <AlertTriangle className="size-7" style={{ color: 'var(--destructive)' }} />
      </span>
      <div className="space-y-2">
        <h1 className="text-xl font-bold text-foreground">Something went wrong</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          This page hit an unexpected error. It&apos;s been logged — try again, or head
          back to the homepage.
        </p>
        {error.digest && (
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/60">
            ref: {error.digest}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-105"
          style={{ background: 'var(--primary)' }}
        >
          <RotateCcw className="size-4" />
          Try again
        </button>
        <Link
          href="/"
          className="hw-panel inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-foreground transition-transform hover:scale-105"
        >
          <Home className="size-4" />
          Go home
        </Link>
      </div>
    </div>
  )
}
