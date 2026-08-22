'use client'

import { Filter, Check, X } from 'lucide-react'
import { type BloomLevel } from '@/lib/types'
import { BLOOM_META } from '@/lib/bloom'
import { cn } from '@/lib/utils'

export type SortOption =
  | 'score-desc'
  | 'score-asc'
  | 'difficulty-asc'
  | 'difficulty-desc'
  | 'verified-first'

const BLOOM_ORDER: Record<BloomLevel, number> = {
  Remember: 0,
  Understand: 1,
  Apply: 2,
  Analyze: 3,
  Evaluate: 4,
  Create: 5,
}

export interface FilterState {
  selectedLevels: BloomLevel[]
  sortBy: SortOption
  verifiedOnly: boolean
}

export const DEFAULT_FILTERS: FilterState = {
  selectedLevels: [],
  sortBy: 'score-desc',
  verifiedOnly: false,
}

/**
 * Apply the current filter + sort to a FinalQAItem-like list.
 */
export function applyFilters<T extends {
  bloomLevel: BloomLevel
  verification: 'pass' | 'flagged' | 'reject'
  score: number
}>(items: T[], f: FilterState): T[] {
  let out = items
  if (f.selectedLevels.length > 0) {
    out = out.filter((q) => f.selectedLevels.includes(q.bloomLevel))
  }
  if (f.verifiedOnly) {
    out = out.filter((q) => q.verification === 'pass')
  }
  const sorted = [...out]
  switch (f.sortBy) {
    case 'score-desc':
      sorted.sort((a, b) => b.score - a.score)
      break
    case 'score-asc':
      sorted.sort((a, b) => a.score - b.score)
      break
    case 'difficulty-asc':
      sorted.sort((a, b) => BLOOM_ORDER[a.bloomLevel] - BLOOM_ORDER[b.bloomLevel])
      break
    case 'difficulty-desc':
      sorted.sort((a, b) => BLOOM_ORDER[b.bloomLevel] - BLOOM_ORDER[a.bloomLevel])
      break
    case 'verified-first':
      sorted.sort((a, b) => {
        if (a.verification !== b.verification)
          return a.verification === 'pass' ? -1 : 1
        return b.score - a.score
      })
      break
  }
  return sorted
}

/* ------------------------------------------------------------------ */
/* The filter bar.                                                     */
/*                                                                     */
/* The sort control used to be a dropdown, and it was the worst kind:  */
/* a popover that pushed the page around when it opened, over five     */
/* options that between them express two axes and one flag. Five       */
/* mutually exclusive choices behind a click, in a bar that has room   */
/* to just show them, is a menu that exists only because menus exist.  */
/*                                                                     */
/* It is now three inline keys. Score and Level are direction toggles  */
/* — click the active one to flip the arrow — and "verified first" is  */
/* the third state. Nothing overlays, nothing reflows, the current     */
/* sort is readable without opening anything, and changing it costs    */
/* one click instead of two.                                           */
/* ------------------------------------------------------------------ */

export function ResultsFilterBar({
  state,
  onChange,
  totalCount,
  filteredCount,
  availableLevels,
}: {
  state: FilterState
  onChange: (s: FilterState) => void
  totalCount: number
  filteredCount: number
  /** which Bloom levels actually appear in the results */
  availableLevels: BloomLevel[]
}) {
  const isFiltered =
    state.selectedLevels.length > 0 ||
    state.sortBy !== 'score-desc' ||
    state.verifiedOnly

  const toggleLevel = (lvl: BloomLevel) => {
    const next = state.selectedLevels.includes(lvl)
      ? state.selectedLevels.filter((l) => l !== lvl)
      : [...state.selectedLevels, lvl]
    onChange({ ...state, selectedLevels: next })
  }

  const clear = () => onChange({ ...DEFAULT_FILTERS })
  const setSort = (v: SortOption) => onChange({ ...state, sortBy: v })

  /** One sort key. Clicking the active key flips its direction. */
  const SortKey = ({
    label,
    asc,
    desc,
  }: {
    label: string
    asc: SortOption
    desc: SortOption
  }) => {
    const active = state.sortBy === asc || state.sortBy === desc
    const isDesc = state.sortBy === desc
    return (
      <button
        type="button"
        onClick={() => setSort(active ? (isDesc ? asc : desc) : desc)}
        aria-pressed={active}
        title={active ? 'Click to reverse' : `Sort by ${label.toLowerCase()}`}
        className={cn(
          'inline-flex items-center gap-1 rounded-[var(--r-xs)] border-[1.5px] px-2 py-[3px]',
          'font-mono text-[10px] font-bold uppercase leading-none tracking-[0.1em]',
          'transition-colors duration-[90ms]',
          active
            ? 'border-[var(--line)] bg-[var(--ink)] text-[var(--paper)]'
            : 'border-[var(--line)]/35 bg-transparent text-[var(--ink-2)] hover:border-[var(--line)] hover:bg-[var(--yellow)] hover:text-[#0a0a0a]',
        )}
      >
        {label}
        <span aria-hidden className={cn(!active && 'opacity-35')}>
          {active && !isDesc ? '↑' : '↓'}
        </span>
      </button>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {/* count */}
      <span className="inline-flex shrink-0 items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--ink-2)]">
        <Filter className="size-3" />
        <span className="text-[var(--ink)]">{filteredCount}</span>
        {filteredCount !== totalCount && <span>/{totalCount}</span>}
        shown
      </span>

      <span className="hidden h-4 w-[2px] rounded-none bg-[var(--line)]/20 sm:block" aria-hidden />

      {/* Bloom level chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        {availableLevels.map((lvl) => {
          const active = state.selectedLevels.includes(lvl)
          const meta = BLOOM_META[lvl]
          return (
            <button
              key={lvl}
              type="button"
              onClick={() => toggleLevel(lvl)}
              aria-pressed={active}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-[var(--r-xs)] border-[1.5px] px-2 py-[3px]',
                'font-mono text-[10px] font-bold uppercase leading-none tracking-[0.1em]',
                'transition-colors duration-[90ms]',
                active
                  ? 'border-[var(--line)]'
                  : 'border-[var(--line)]/35 text-[var(--ink-2)] hover:border-[var(--line)]',
              )}
              style={active ? { backgroundColor: meta.hue, color: meta.fg } : undefined}
            >
              <span
                className="size-2 rounded-full border-[1.5px] border-[var(--line)]"
                style={{ backgroundColor: meta.hue }}
                aria-hidden
              />
              {lvl}
            </button>
          )
        })}
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        <span className="mr-0.5 hidden font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--ink-2)] md:inline">
          sort
        </span>
        <SortKey label="Score" asc="score-asc" desc="score-desc" />
        <SortKey label="Level" asc="difficulty-asc" desc="difficulty-desc" />
        <button
          type="button"
          onClick={() => setSort('verified-first')}
          aria-pressed={state.sortBy === 'verified-first'}
          className={cn(
            'inline-flex items-center gap-1 rounded-[var(--r-xs)] border-[1.5px] px-2 py-[3px]',
            'font-mono text-[10px] font-bold uppercase leading-none tracking-[0.1em]',
            'transition-colors duration-[90ms]',
            state.sortBy === 'verified-first'
              ? 'border-[var(--line)] bg-[var(--ink)] text-[var(--paper)]'
              : 'border-[var(--line)]/35 text-[var(--ink-2)] hover:border-[var(--line)] hover:bg-[var(--yellow)] hover:text-[#0a0a0a]',
          )}
        >
          Verified first
        </button>

        <span className="mx-1 hidden h-4 w-[2px] rounded-none bg-[var(--line)]/20 sm:block" aria-hidden />

        <button
          type="button"
          onClick={() => onChange({ ...state, verifiedOnly: !state.verifiedOnly })}
          aria-pressed={state.verifiedOnly}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-[var(--r-xs)] border-[1.5px] px-2 py-[3px]',
            'font-mono text-[10px] font-bold uppercase leading-none tracking-[0.1em]',
            'transition-colors duration-[90ms]',
            state.verifiedOnly
              ? 'border-[var(--line)] bg-[var(--bloom-3)] text-[#0a0a0a]'
              : 'border-[var(--line)]/35 text-[var(--ink-2)] hover:border-[var(--line)] hover:bg-[var(--yellow)] hover:text-[#0a0a0a]',
          )}
        >
          <Check className="size-3" strokeWidth={3} />
          Verified only
        </button>

        {isFiltered && (
          <button
            type="button"
            onClick={clear}
            className="inline-flex items-center gap-1 rounded-[var(--r-xs)] border-[1.5px] border-[var(--line)]/35 px-2 py-[3px] font-mono text-[10px] font-bold uppercase leading-none tracking-[0.1em] text-[var(--ink-2)] transition-colors duration-[90ms] hover:border-[var(--red)] hover:bg-[var(--red)] hover:text-white"
          >
            <X className="size-3" strokeWidth={3} />
            Clear
          </button>
        )}
      </div>
    </div>
  )
}
