'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Bot, History, LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'

const LINKS = [
  { href: '/app', label: 'Console', icon: LayoutGrid, exact: true },
  { href: '/app/agents', label: 'Agents', icon: Bot },
  { href: '/app/history', label: 'History', icon: History },
  { href: '/', label: 'Home', icon: Home, exact: true },
] as const

/**
 * Primary navigation — a single segmented group with a visible active
 * state.
 *
 * Previously these were loose ghost buttons scattered among the theme
 * toggle, palette dots and sign out, with no indication of where you
 * were. Grouping them into one bordered cluster and marking the current
 * route makes the app read as a set of places rather than a row of
 * anonymous buttons.
 */
export function MainNav({ className }: { className?: string }) {
  const pathname = usePathname()

  return (
    <nav
      className={cn(
        'items-center gap-0.5 rounded-md border border-border/60 bg-muted/35 p-0.5',
        className,
      )}
      aria-label="Primary"
    >
      {LINKS.map(({ href, label, icon: Icon, ...rest }) => {
        const exact = 'exact' in rest && rest.exact
        const active = exact ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-semibold transition-colors',
              active
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="size-3.5 shrink-0" aria-hidden />
            <span className="hidden lg:inline">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
