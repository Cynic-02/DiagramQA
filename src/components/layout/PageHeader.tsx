'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MainNav } from './MainNav'
import { AppearanceMenu } from './AppearanceMenu'
import { UserMenu } from './UserMenu'

/**
 * Shared header for every non-console route.
 *
 * Each secondary page used to hand-roll its own nav: a back link, one or
 * two arbitrary buttons and a bare ThemeToggle, in a different
 * arrangement per page. Navigation therefore changed shape depending on
 * where you stood, and some destinations were simply unreachable from
 * others — you could not get from Agents to History without going via
 * the Console. That inconsistency is most of why the app read as two
 * pages rather than six.
 *
 * This gives every route the same three zones as the console TopBar, so
 * the chrome stays put and only the content changes.
 */
export function PageHeader({ title }: { title: string }) {
  return (
    <header className="glass-chrome sticky top-0 z-50 flex h-14 w-full shrink-0 items-center gap-3 border-b px-4 sm:px-6">
      {/* Breadcrumb */}
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 shrink-0 gap-1.5 text-[11px] font-bold"
          asChild
        >
          <Link href="/app">
            <ArrowLeft className="size-3" aria-hidden />
            Console
          </Link>
        </Button>
        <span className="shrink-0 text-border" aria-hidden>
          /
        </span>
        <span className="truncate text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
      </div>

      {/* Navigation — identical to the console header */}
      <div className="flex shrink-0 items-center gap-2">
        <MainNav className="hidden sm:flex" />
        <span
          className="mx-0.5 hidden h-5 w-px bg-border sm:inline-block"
          aria-hidden
        />
        <AppearanceMenu />
        <UserMenu />
      </div>
    </header>
  )
}
