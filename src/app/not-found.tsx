import Link from 'next/link'
import { Compass, Home } from 'lucide-react'

/**
 * Custom 404 — Next.js falls back to a bare unstyled default page for any
 * unmatched route without this file.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-6 text-center">
      <span
        className="flex size-14 items-center justify-center rounded-full"
        style={{ background: 'color-mix(in srgb, var(--primary) 15%, transparent)' }}
      >
        <Compass className="size-7" style={{ color: 'var(--primary)' }} />
      </span>
      <div className="space-y-2">
        <h1 className="text-xl font-bold text-foreground">Page not found</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          There&apos;s nothing here — the page may have moved or never existed.
        </p>
      </div>
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-105"
        style={{ background: 'var(--primary)' }}
      >
        <Home className="size-4" />
        Go home
      </Link>
    </div>
  )
}
