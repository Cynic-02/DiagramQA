'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Filter, ArrowUpDown, Check, X, ChevronDown } from 'lucide-react'
import { BLOOM_LEVELS, type BloomLevel } from '@/lib/types'
import { BLOOM_META } from '@/lib/bloom'
import { cn } from '@/lib/utils'

export type SortOption =
  | 'score-desc'
  | 'score-asc'
  | 'difficulty-asc'
  | 'difficulty-desc'
  | 'verified-first'

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'score-desc', label: 'Score: High → Low' },
  { value: 'score-asc', label: 'Score: Low → High' },
  { value: 'difficulty-asc', label: 'Difficulty: Low → High' },
  { value: 'difficulty-desc', label: 'Difficulty: High → Low' },
  { value: 'verified-first', label: 'Verified first' },
]

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
  verification: 'pass' | 'flagged'
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
  const [sortOpen, setSortOpen] = React.useState(false)
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

  const currentSort = SORT_OPTIONS.find((o) => o.value === state.sortBy)

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="brutal-block flex flex-wrap items-center gap-3 bg-card p-3"
    >
      {/* filter icon + count */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Filter className="size-3.5" />
        <span className="font-mono">
          {filteredCount}
          {filteredCount !== totalCount && (
            <span className="text-muted-foreground/60">/{totalCount}</span>
          )}{' '}
          shown
        </span>
      </div>

      <div className="hidden h-5 w-0.5 bg-border sm:block" />

      {/* Bloom level chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        {availableLevels.map((lvl) => {
          const active = state.selectedLevels.includes(lvl)
          const hue = BLOOM_META[lvl].hue
          return (
            <button
              key={lvl}
              type="button"
              onClick={() => toggleLevel(lvl)}
              aria-pressed={active}
              className={cn(
                'inline-flex items-center gap-1 border-[2px] px-2 py-0.5 text-[11px] font-bold leading-none transition-all',
                active
                  ? 'border-border text-foreground'
                  : 'border-border bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
              style={
                active
                  ? {
                      backgroundColor: hue,
                      color: 'var(--foreground)',
                    }
                  : undefined
              }
            >
              <span
                className="size-1.5 rounded-full border border-border"
                style={{ backgroundColor: hue }}
              />
              {lvl}
            </button>
          )
        })}
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* verified-only toggle */}
        <button
          type="button"
          onClick={() => onChange({ ...state, verifiedOnly: !state.verifiedOnly })}
          aria-pressed={state.verifiedOnly}
          className={cn(
            'inline-flex items-center gap-1.5 border-[2px] px-2.5 py-1 text-[11px] font-bold leading-none transition-all',
            state.verifiedOnly
              ? 'border-border bg-accent text-accent-foreground'
              : 'border-border bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
        >
          <Check className="size-3" />
          Verified only
        </button>

        {/* sort dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setSortOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 border-[2px] border-border bg-muted px-2.5 py-1 text-[11px] font-bold leading-none text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground"
          >
            <ArrowUpDown className="size-3" />
            <span className="hidden sm:inline">{currentSort?.label ?? 'Sort'}</span>
            <ChevronDown
              className={cn('size-3 transition-transform', sortOpen && 'rotate-180')}
            />
          </button>
          <AnimatePresence>
            {sortOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setSortOpen(false)}
                />
                <motion.ul
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                  className="brutal-block absolute right-0 top-full z-50 mt-1.5 min-w-[180px] overflow-hidden bg-popover py-1"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <li key={opt.value}>
                      <button
                        type="button"
                        onClick={() => {
                          onChange({ ...state, sortBy: opt.value })
                          setSortOpen(false)
                        }}
                        className={cn(
                          'flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                          state.sortBy === opt.value
                            ? 'text-primary'
                            : 'text-muted-foreground'
                        )}
                      >
                        {opt.label}
                        {state.sortBy === opt.value && (
                          <Check className="size-3" />
                        )}
                      </button>
                    </li>
                  ))}
                </motion.ul>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* clear */}
        {isFiltered && (
          <button
            type="button"
            onClick={clear}
            className="inline-flex items-center gap-1 border-[2px] border-border bg-muted px-2 py-1 text-[11px] font-bold leading-none text-muted-foreground transition-all hover:bg-destructive hover:text-destructive-foreground"
          >
            <X className="size-3" />
            Clear
          </button>
        )}
      </div>
    </motion.div>
  )
}
