'use client'

/**
 * Run history.
 *
 * Was a grid of 360px-tall cards, each carrying a thumbnail, five pills,
 * a description and two buttons — so eight runs filled three screens and
 * comparing any two of them meant scrolling between them.
 *
 * It is now a ruled register: one row per run, every column in the same
 * place on every row, the whole thing scrolling inside a fixed frame.
 * Density is the feature — you can see a dozen runs at once and scan down
 * a single column to compare them.
 */

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Loader2, FileText, Trash2, ArrowRight, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { PageFrame, Ledger, Segmented } from '@/components/layout/PageFrame'
import { Button } from '@/components/ui/button'
import { usePipelineStore } from '@/lib/store'
import { BLOOM_META } from '@/lib/bloom'
import type { BloomLevel } from '@/lib/types'
import { cn } from '@/lib/utils'

interface HistoryItem {
  id: string
  filename: string
  dataUrl: string
  bloomLevel: string
  status: 'running' | 'completed' | 'failed'
  diagramType?: string
  qaCount: number
  provider?: string
  createdAt: string
}

type StatusFilter = 'all' | 'completed' | 'running' | 'failed'

export default function HistoryPage() {
  const router = useRouter()
  const hydrateFromHistory = usePipelineStore((s) => s.hydrateFromHistory)

  const [items, setItems] = React.useState<HistoryItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [restoringId, setRestoringId] = React.useState<string | null>(null)
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('all')
  const [searchQuery, setSearchQuery] = React.useState('')
  const [stats, setStats] = React.useState<any>(null)
  const [health, setHealth] = React.useState<any>(null)

  const loadHistory = React.useCallback(async () => {
    setLoading(true)
    try {
      const [histRes, statsRes, healthRes] = await Promise.all([
        fetch('/api/history'),
        fetch('/api/stats'),
        fetch('/api/health'),
      ])
      const data = await histRes.json()
      setItems(data.items || [])
      if (statsRes.ok) setStats(await statsRes.json())
      if (healthRes.ok) setHealth(await healthRes.json())
    } catch {
      toast.error('Failed to load past run history')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void loadHistory()
  }, [loadHistory])

  const handleRestore = async (id: string) => {
    setRestoringId(id)
    try {
      const res = await fetch(`/api/runs/${id}`)
      if (!res.ok) throw new Error()
      const record = await res.json()
      hydrateFromHistory({
        runId: record.id,
        filename: record.filename,
        dataUrl: record.dataUrl,
        bloomLevel: record.bloomLevel,
        status: record.status,
        diagramType: record.diagramType,
        extraction: record.extraction,
        questions: record.questions,
        answers: record.answers,
        verification: record.verification,
        finalQA: record.finalQA,
        errorMessage: record.errorMessage,
      })
      toast.success('Console restored to past run state')
      router.push('/app')
    } catch {
      toast.error('Could not restore past run state')
    } finally {
      setRestoringId(null)
    }
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    try {
      const res = await fetch(`/api/runs/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setItems((prev) => prev.filter((i) => i.id !== id))
      toast.success('Run record deleted from history')
    } catch {
      toast.error('Delete failed')
    }
  }

  const counts = React.useMemo(
    () => ({
      all: items.length,
      completed: items.filter((i) => i.status === 'completed').length,
      running: items.filter((i) => i.status === 'running').length,
      failed: items.filter((i) => i.status === 'failed').length,
    }),
    [items],
  )

  const filteredItems = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return items.filter((item) => {
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter
      const matchesSearch =
        q === '' ||
        item.filename.toLowerCase().includes(q) ||
        item.bloomLevel.toLowerCase().includes(q) ||
        (item.diagramType ?? '').toLowerCase().includes(q)
      return matchesStatus && matchesSearch
    })
  }, [items, statusFilter, searchQuery])

  return (
    <PageFrame
      eyebrow="Run history"
      title="Run history"
      lede="Every past ingestion. Open one to reload its extraction, calibration and verified question set into the console."
      ledger={
        <Ledger
          cells={[
            { k: 'Runs', v: stats?.runs?.total ?? items.length },
            { k: 'Success', v: `${Math.round((stats?.runs?.successRate || 0) * 100)}%` },
            {
              k: 'Avg time',
              v: stats?.runs?.averageDurationMs
                ? `${(stats.runs.averageDurationMs / 1000).toFixed(1)}s`
                : '—',
            },
            {
              k: 'System',
              v: (
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className={cn(
                      'size-1.5 rounded-full',
                      health?.ok ? 'bg-[var(--bloom-2)]' : 'bg-[var(--red)]',
                    )}
                    aria-hidden
                  />
                  {health?.ok ? 'online' : 'offline'}
                </span>
              ),
            },
          ]}
        />
      }
      controls={
        <div className="flex flex-wrap items-center gap-3">
          <Segmented
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { id: 'all', label: 'All', count: counts.all },
              { id: 'completed', label: 'Done', count: counts.completed },
              { id: 'running', label: 'Running', count: counts.running },
              { id: 'failed', label: 'Failed', count: counts.failed },
            ]}
          />
          <div className="relative ml-auto w-full max-w-[280px]">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--ink-2)]"
              aria-hidden
            />
            <input
              type="text"
              placeholder="Search file, type or level…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-full rounded-[var(--r-s)] border-[1.5px] border-[var(--line)] bg-[var(--card)] pl-8 pr-8 text-[11px] placeholder:text-[var(--ink-2)] focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ink-2)] hover:text-[var(--red)]"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      }
      status={
        <>
          <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--ink-2)]">
            {filteredItems.length} shown · {items.length} total
          </span>
          <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--ink-2)]">
            Click a row to restore
          </span>
        </>
      }
    >
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="size-5 animate-spin text-[var(--ink-2)]" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="ticket mx-auto mt-6 flex max-w-[520px] flex-col items-center justify-center gap-3 px-8 py-8 text-center">
          <span className="flex size-11 items-center justify-center rounded-[var(--r-s)] border-2 border-[var(--line)] bg-[var(--yellow)]">
            <FileText className="size-5 text-[#0a0a0a]" />
          </span>
          <p className="font-[family-name:var(--font-archivo)] text-[15px] font-black uppercase tracking-[-0.01em]">
            {items.length === 0 ? 'No runs yet' : 'No runs match this filter'}
          </p>
          <p className="max-w-[46ch] text-[11.5px] leading-relaxed text-[var(--ink-2)]">
            {items.length === 0
              ? 'Ingest a diagram in the console — or run the sample demo — and completed runs land here automatically.'
              : 'Try a different status or clear the search.'}
          </p>
        </div>
      ) : (
        <div className="glass-surface mx-auto w-full max-w-[1400px] overflow-hidden border-2 border-[var(--line)] shadow-[4px_4px_0_var(--line)]">
          {/* column headings */}
          <div className="hidden grid-cols-[64px_minmax(0,2.2fr)_minmax(0,1.4fr)_112px_92px_64px_104px_72px] items-center gap-3 rounded-none border-b-2 border-[var(--line)] bg-[color-mix(in_srgb,var(--paper)_55%,transparent)] px-3 py-2 lg:grid">
            {['', 'Source', 'Diagram type', 'Level', 'Status', 'Q&A', 'When', ''].map((h, i) => (
              <span
                key={i}
                className="font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-[var(--ink-2)]"
              >
                {h}
              </span>
            ))}
          </div>

          <ul>
            {filteredItems.map((item, i) => (
              <HistoryRow
                key={item.id}
                item={item}
                index={i}
                restoring={restoringId === item.id}
                onOpen={() => handleRestore(item.id)}
                onDelete={(e) => handleDelete(e, item.id)}
              />
            ))}
          </ul>
        </div>
      )}
    </PageFrame>
  )
}

/* ------------------------------------------------------------------ */

function HistoryRow({
  item,
  index,
  restoring,
  onOpen,
  onDelete,
}: {
  item: HistoryItem
  index: number
  restoring: boolean
  onOpen: () => void
  onDelete: (e: React.MouseEvent) => void
}) {
  const meta = BLOOM_META[item.bloomLevel as BloomLevel]

  return (
    <motion.li
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.3) }}
      className="rounded-none border-b-2 border-[var(--line)]/15 last:border-b-0"
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onOpen()
          }
        }}
        className="group grid cursor-pointer grid-cols-[56px_minmax(0,1fr)_72px] items-center gap-3 px-3 py-2 transition-colors duration-[90ms] hover:bg-[color-mix(in_srgb,var(--yellow)_22%,transparent)] lg:grid-cols-[64px_minmax(0,2.2fr)_minmax(0,1.4fr)_112px_92px_64px_104px_72px]"
      >
        {/* thumb */}
        <div className="h-10 w-full overflow-hidden rounded-[var(--r-xs)] border-[1.5px] border-[var(--line)]/45 bg-[var(--paper)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.dataUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>

        {/* source */}
        <div className="min-w-0">
          <p className="truncate text-[12px] font-bold leading-tight" title={item.filename}>
            {item.filename}
          </p>
          <p className="truncate font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--ink-2)] lg:hidden">
            {item.bloomLevel} · {item.qaCount} q&a · {formatWhen(item.createdAt)}
          </p>
          {item.provider && (
            <p className="hidden truncate font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--ink-2)] lg:block">
              {item.provider}
            </p>
          )}
        </div>

        {/* diagram type */}
        <span
          className="hidden truncate text-[11px] text-[var(--ink-2)] lg:block"
          title={item.diagramType}
        >
          {item.diagramType || '—'}
        </span>

        {/* bloom level */}
        <span className="hidden lg:block">
          <span
            className="inline-block max-w-full truncate rounded-[var(--r-xs)] border-[1.5px] border-[var(--line)]/45 px-1.5 py-[2px] font-mono text-[9px] font-bold uppercase tracking-[0.12em]"
            style={
              meta ? { backgroundColor: meta.hue, color: meta.fg } : undefined
            }
          >
            {item.bloomLevel}
          </span>
        </span>

        {/* status */}
        <span className="hidden lg:block">
          <StatusTag status={item.status} />
        </span>

        {/* qa count */}
        <span className="dat hidden text-[12px] font-bold lg:block">{item.qaCount}</span>

        {/* when */}
        <span className="hidden font-mono text-[10px] text-[var(--ink-2)] lg:block">
          {formatWhen(item.createdAt)}
        </span>

        {/* actions */}
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="xs"
            onClick={onDelete}
            aria-label="Delete run"
            className="size-7 rounded-[var(--r-xs)] border-[1.5px] border-transparent p-0 text-[var(--ink-2)] hover:border-[var(--line)] hover:bg-[var(--red)] hover:text-white"
          >
            <Trash2 className="size-3.5" />
          </Button>
          <span
            className="flex size-7 items-center justify-center text-[var(--ink-2)] transition-colors group-hover:text-[var(--red)]"
            aria-hidden
          >
            {restoring ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <ArrowRight className="size-3.5" />
            )}
          </span>
        </div>
      </div>
    </motion.li>
  )
}

function StatusTag({ status }: { status: HistoryItem['status'] }) {
  const map = {
    completed: { label: 'done', cls: 'bg-[var(--ink)] text-[var(--paper)]' },
    running: { label: 'running', cls: 'bg-[var(--yellow)] text-[#0a0a0a]' },
    failed: { label: 'failed', cls: 'bg-[var(--red)] text-white' },
  } as const
  const s = map[status]
  return (
    <span
      className={cn(
        'inline-block rounded-[var(--r-xs)] border-[1.5px] border-[var(--line)] px-1.5 py-[2px] font-mono text-[9px] font-bold uppercase leading-none tracking-[0.12em]',
        s.cls,
      )}
    >
      {s.label}
    </span>
  )
}

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso)
    const now = Date.now()
    const diff = now - d.getTime()
    const min = Math.round(diff / 60000)
    if (min < 1) return 'just now'
    if (min < 60) return `${min}m ago`
    const hr = Math.round(min / 60)
    if (hr < 24) return `${hr}h ago`
    const day = Math.round(hr / 24)
    if (day < 7) return `${day}d ago`
    return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' })
  } catch {
    return '—'
  }
}
