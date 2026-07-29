'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { KeyRound, LogOut, User, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

/**
 * Account menu — Profile, API Keys and Sign out behind a single avatar.
 *
 * These were three separate always-visible buttons in the top bar.
 * Account-level actions are low-frequency and destructive-adjacent
 * (Sign out sat one pixel from navigation), so they belong grouped
 * under the user's own identity rather than competing with the primary
 * nav for space.
 */
export function UserMenu({
  email,
  className,
}: {
  email?: string | null
  className?: string
}) {
  const router = useRouter()
  const [fetched, setFetched] = React.useState<string | null>(null)

  // Self-loading so the menu works on every route without prop-drilling
  // a session through each page. Skipped when an email is passed in.
  React.useEffect(() => {
    if (email) return
    let cancelled = false
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d) setFetched(d.email ?? d.user?.email ?? null)
      })
      .catch(() => {
        /* header must never break on a failed session probe */
      })
    return () => {
      cancelled = true
    }
  }, [email])

  const shown = email ?? fetched

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
    router.refresh()
  }

  const initial = (shown?.trim()?.[0] ?? 'U').toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn('h-8 gap-1.5 px-1.5', className)}
          aria-label="Account menu"
        >
          <span
            className="grid size-6 shrink-0 place-items-center rounded-full border border-border/60 bg-primary/15 font-mono text-[11px] font-bold text-foreground"
            aria-hidden
          >
            {initial}
          </span>
          <ChevronDown className="size-3 text-muted-foreground" aria-hidden />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <span className="block font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Signed in
          </span>
          <span className="mt-0.5 block truncate text-xs font-semibold text-foreground">
            {shown || 'Your account'}
          </span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/app/settings/account" className="cursor-pointer gap-2">
            <User className="size-3.5" aria-hidden />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/app/settings/api-keys" className="cursor-pointer gap-2">
            <KeyRound className="size-3.5" aria-hidden />
            API Keys
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onSelect={handleLogout}
          className="cursor-pointer gap-2 text-destructive focus:text-destructive"
        >
          <LogOut className="size-3.5" aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
