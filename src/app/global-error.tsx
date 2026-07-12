'use client'

import { useEffect } from 'react'

/**
 * Last-resort error boundary — only triggers if the ROOT layout itself
 * throws (theme provider, fonts, etc.), which regular error.tsx files
 * can't catch since they render inside that same layout. Per Next.js,
 * this file must render its own <html>/<body> since it fully replaces
 * the root layout when active. Deliberately has zero dependencies on the
 * app's own components/providers/fonts — the whole point of a last-resort
 * fallback is that it can't itself fail the same way the thing it's
 * catching for did. Inline styles only, no Tailwind/theme-var reliance,
 * so it still renders even if something upstream of styling broke too.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[global error boundary]', error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1.5rem',
          padding: '1.5rem',
          textAlign: 'center',
          background: '#0e1219',
          color: '#e8e2d5',
          fontFamily:
            'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
            DiagramMind hit a problem
          </h1>
          <p
            style={{
              maxWidth: '28rem',
              margin: '0.5rem auto 0',
              fontSize: '0.875rem',
              color: '#9ca3af',
            }}
          >
            The app failed to load. This has been logged — reloading usually fixes it.
          </p>
          {error.digest && (
            <p
              style={{
                marginTop: '0.5rem',
                fontFamily: 'monospace',
                fontSize: '0.625rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#6b7280',
              }}
            >
              ref: {error.digest}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={() => reset()}
            style={{
              borderRadius: '9999px',
              padding: '0.6rem 1.4rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#0e1219',
              background: '#3ba4c7',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
          <a
            href="/"
            style={{
              borderRadius: '9999px',
              padding: '0.6rem 1.4rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#e8e2d5',
              background: 'transparent',
              border: '1px solid rgba(232,226,213,0.25)',
              textDecoration: 'none',
            }}
          >
            Go home
          </a>
        </div>
      </body>
    </html>
  )
}
