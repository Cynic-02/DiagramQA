'use client'

/**
 * PageFrame — the shell every non-console route uses.
 *
 * Same contract as the console: locked to the viewport, document never
 * scrolls, one designated pane does. Chrome (nav, masthead, controls,
 * status strip) stays put while only the content moves, so switching
 * between Console, History, Agents and API Keys never shifts the
 * furniture.
 *
 *   <PageFrame eyebrow="…" title="…" lede="…" actions={…} ledger={…}
 *              controls={…} status={…}>
 *     …the scrolling content…
 *   </PageFrame>
 */

import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { MainNav } from './MainNav'
import { AppearanceMenu } from './AppearanceMenu'
import { UserMenu } from './UserMenu'
import { cn } from '@/lib/utils'

export function PageFrame({
  eyebrow,
  title,
  lede,
  actions,
  ledger,
  controls,
  status,
  children,
}: {
  eyebrow: string
  title: string
  lede?: string
  /** Buttons on the masthead's right edge. */
  actions?: React.ReactNode
  /** Optional key/value cells rendered as a ruled strip beside the title. */
  ledger?: React.ReactNode
  /** A pinned bar between the masthead and the scrolling pane. */
  controls?: React.ReactNode
  /** A pinned one-line strip at the very bottom. */
  status?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <div aria-hidden className="pointer-events-none h-1 shrink-0 bg-[var(--red)]" />

      {/* ---------- nav ---------- */}
      <header className="flex h-12 shrink-0 items-center gap-3 border-b-2 border-[var(--line)] bg-[var(--card)] px-4 sm:px-6">
        <Link
          href="/app"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-[var(--r-xs)] border-[1.5px] border-transparent px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--ink-2)] transition-colors hover:border-[var(--line)] hover:bg-[var(--yellow)] hover:text-[#0a0a0a]"
        >
          <ArrowLeft className="size-3" aria-hidden />
          Console
        </Link>
        <span className="shrink-0 font-mono text-[10px] text-[var(--ink-2)]" aria-hidden>
          /
        </span>
        <span className="truncate font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--ink)]">
          {eyebrow}
        </span>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <MainNav className="hidden sm:flex" />
          <span className="mx-0.5 hidden h-5 w-[2px] bg-[var(--line)]/30 sm:inline-block" aria-hidden />
          <AppearanceMenu />
          <UserMenu />
        </div>
      </header>

      {/* ---------- masthead ---------- */}
      <div className="flex shrink-0 flex-col gap-3 border-b-2 border-[var(--line)] bg-[var(--card)] px-5 py-3.5 lg:flex-row lg:items-center lg:justify-between lg:gap-6 md:px-8">
        <div className="min-w-0">
          <h1 className="font-[family-name:var(--font-archivo)] text-xl font-black uppercase leading-none tracking-[-0.03em] md:text-2xl">
            {title}
          </h1>
          {lede && (
            <p className="mt-1.5 max-w-3xl text-[11px] leading-snug text-[var(--ink-2)]">{lede}</p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          {ledger}
          {actions}
        </div>
      </div>

      {/* ---------- controls ---------- */}
      {controls && (
        <div className="shrink-0 border-b-2 border-[var(--line)]/40 bg-[var(--card)] px-5 py-2 md:px-8">
          {controls}
        </div>
      )}

      {/* ---------- the one scrolling pane ---------- */}
      <main className="relative flex flex-col min-h-0 flex-1 overflow-y-auto px-5 py-4 md:px-8">
        {children}
      </main>

      {status && (
        <footer className="flex h-8 shrink-0 items-center gap-4 border-t-2 border-[var(--line)]/40 bg-[var(--card)] px-5 md:px-8">
          {status}
        </footer>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Shared bits the pages build their chrome from                       */
/* ------------------------------------------------------------------ */

/** A ruled key/value strip. Cells share one border, never two. */
export function Ledger({ cells }: { cells: Array<{ k: string; v: React.ReactNode }> }) {
  return (
    <dl className="grid grid-cols-2 overflow-hidden rounded-[var(--r-s)] border-[1.5px] border-[var(--line)]/45 sm:grid-cols-4">
      {cells.map((c) => (
        <div
          key={c.k}
          className={cn(
            'min-w-[92px] rounded-none border-[var(--line)]/25 px-2.5 py-1',
            '[&:nth-child(odd)]:border-r-[1.5px] [&:nth-child(n+3)]:border-t-[1.5px]',
            'sm:[&:nth-child(odd)]:border-r-0 sm:[&:nth-child(n+3)]:border-t-0 sm:[&:not(:first-child)]:border-l-[1.5px]',
          )}
        >
          <dt className="font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-[var(--ink-2)]">
            {c.k}
          </dt>
          <dd className="dat truncate text-[11px] font-bold leading-tight text-[var(--ink)]">
            {c.v}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/** A ruled segmented control. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T
  options: Array<{ id: T; label: string; count?: number }>
  onChange: (v: T) => void
  className?: string
}) {
  return (
    <div data-segmented className={cn('flex border-[1.5px] border-[var(--line)]', className)}>
      {options.map((o, i) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          aria-pressed={value === o.id}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] transition-colors duration-[90ms]',
            i > 0 && 'border-l-[1.5px] border-[var(--line)]',
            value === o.id
              ? 'bg-[var(--ink)] text-[var(--paper)]'
              : 'bg-[var(--card)] text-[var(--ink-2)] hover:bg-[var(--yellow)] hover:text-[#0a0a0a]',
          )}
        >
          {o.label}
          {typeof o.count === 'number' && (
            <span className={value === o.id ? 'opacity-60' : 'opacity-70'}>{o.count}</span>
          )}
        </button>
      ))}
    </div>
  )
}

/** Section rule with a monospace label — used inside scrolling panes. */
export function SectionRule({
  children,
  right,
}: {
  children: React.ReactNode
  right?: React.ReactNode
}) {
  return (
    <div className="mb-2.5 flex items-center gap-3">
      <span className="fig-label shrink-0">{children}</span>
      <span className="h-[2px] flex-1 rounded-none bg-[var(--line)]/18" aria-hidden />
      {right}
    </div>
  )
}
