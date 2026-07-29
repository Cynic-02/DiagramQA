'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Loader2, Calendar, FileText, Bot, HelpCircle, ArrowRight, Trash2, HelpCircle as QuestionIcon
} from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { usePipelineStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import LineSidebar from '@/components/reactbits/LineSidebar'

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

export default function HistoryPage() {
  const router = useRouter()
  const hydrateFromHistory = usePipelineStore((s) => s.hydrateFromHistory)
  const [items, setItems] = React.useState<HistoryItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [restoringId, setRestoringId] = React.useState<string | null>(null)
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'completed' | 'running' | 'failed'>('all')
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
      
      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }
      if (healthRes.ok) {
        const healthData = await healthRes.json()
        setHealth(healthData)
      }
    } catch {
      toast.error('Failed to load past run history')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const handleRestore = async (id: string) => {
    setRestoringId(id)
    try {
      const res = await fetch(`/api/runs/${id}`)
      if (!res.ok) throw new Error()
      const runRecord = await res.json()
      
      // Hydrate local store state with the fetched run data
      hydrateFromHistory({
        ...runRecord,
        runId: runRecord.id
      })
      toast.success('Console restored to past run state')
      
      // Navigate to the main console page
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
      setItems((prev) => prev.filter((item) => item.id !== id))
      toast.success('Run record deleted from history')
    } catch {
      toast.error('Delete failed')
    }
  }

  const filteredItems = React.useMemo(() => {
    return items.filter((item) => {
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter
      const matchesSearch = searchQuery === '' || 
        item.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.bloomLevel.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.diagramType && item.diagramType.toLowerCase().includes(searchQuery.toLowerCase()))
      return matchesStatus && matchesSearch
    })
  }, [items, statusFilter, searchQuery])

  const handleSidebarClick = (index: number) => {
    const filters: Array<'all' | 'completed' | 'running' | 'failed'> = ['all', 'completed', 'running', 'failed']
    setStatusFilter(filters[index] || 'all')
  }

  return (
    <div className="relative flex min-h-screen flex-col grid-faint-lighter bg-background text-foreground">
      {/* Nav */}
      <PageHeader title="Run History" />

      <div className="relative z-10 mx-auto w-full max-w-5xl flex-1 p-6 md:p-8">
        {/* Header */}
        <div className="mb-8 space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center border border-primary/45 bg-primary/10 text-primary rounded-lg">
              <Calendar className="size-5" />
            </div>
            <h1 className="text-2xl font-black tracking-tight md:text-[28px] uppercase">
              Run <span className="text-primary">History</span>
            </h1>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Review and restore previous runs. Click "Open in Console" on any past diagram ingestion to reload the 
            visual entities, prompt calibrations, and generated questions into the main workspace.
          </p>
        </div>

        {/* Stats & Health Cards */}
        {stats && (
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4 mb-8">
            <Card className="p-4 flex flex-col justify-between rounded-xl border border-border/50 bg-card/45">
              <span className="text-[10px] font-mono uppercase text-muted-foreground">Total Ingestions</span>
              <span className="text-xl font-black mt-1 text-foreground">{stats.runs?.total || 0}</span>
            </Card>
            <Card className="p-4 flex flex-col justify-between rounded-xl border border-border/50 bg-card/45">
              <span className="text-[10px] font-mono uppercase text-muted-foreground">Success Rate</span>
              <span className="text-xl font-black mt-1 text-emerald-500">
                {Math.round((stats.runs?.successRate || 0) * 100)}%
              </span>
            </Card>
            <Card className="p-4 flex flex-col justify-between rounded-xl border border-border/50 bg-card/45">
              <span className="text-[10px] font-mono uppercase text-muted-foreground">Avg Duration</span>
              <span className="text-xl font-black mt-1 text-foreground">
                {stats.runs?.averageDurationMs 
                  ? `${(stats.runs.averageDurationMs / 1000).toFixed(1)}s` 
                  : 'N/A'}
              </span>
            </Card>
            <Card className="p-4 flex flex-col justify-between rounded-xl border border-border/50 bg-card/45">
              <span className="text-[10px] font-mono uppercase text-muted-foreground">System Health</span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`size-2 rounded-full ${health?.ok ? 'bg-emerald-500 animate-pulse' : 'bg-destructive'}`} />
                <span className="text-xs font-bold text-foreground">
                  {health?.ok ? 'Online' : 'Offline'}
                </span>
              </div>
            </Card>
          </div>
        )}

        {/* Search & Stats Header block */}
        {!loading && items.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-6">
            <div className="relative w-full sm:max-w-xs">
              <input
                type="text"
                placeholder="Search runs by file or type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 rounded-md border border-border bg-card px-3 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
              <span>Total: {items.length}</span>
              <span>·</span>
              <span>Completed: {items.filter((item) => item.status === 'completed').length}</span>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <Card className="brutal-block flex flex-col items-center justify-center gap-3 p-12 text-center">
            <div className="flex size-12 items-center justify-center border border-border/70 bg-muted text-muted-foreground rounded-lg">
              <FileText className="size-5" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-foreground/80">No runs in your history</p>
              <p className="mx-auto max-w-sm text-[11px] text-muted-foreground leading-normal">
                Upload a diagram in the Console stage to kick off the pipeline. Completed runs will appear here automatically.
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid gap-8 md:grid-cols-[180px_minmax(0,1fr)] items-start mt-8">
            {/* Left Column: sticky status selector sidebar */}
            <aside className="sticky top-20 hidden md:block border-r border-border/40 pr-6">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-4">
                Filter Status
              </span>
              <LineSidebar
                items={['All Runs', 'Completed', 'Running', 'Failed']}
                defaultActive={0}
                onItemClick={handleSidebarClick}
                fontSize={0.9}
                itemGap={14}
                maxShift={15}
                accentColor="var(--primary)"
                textColor="var(--text-secondary)"
                markerColor="var(--border)"
                smoothing={150}
              />
            </aside>

            {/* Right Column: Grid list filtered items */}
            <div className="flex-grow space-y-4">
              {/* Mobile Filter buttons helper (just in case sidebar is hidden) */}
              <div className="flex flex-wrap gap-2 md:hidden mb-4">
                {(['all', 'completed', 'running', 'failed'] as const).map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={statusFilter === status ? 'default' : 'outline'}
                    className="h-8 text-[10px] font-bold rounded-full capitalize"
                    onClick={() => setStatusFilter(status)}
                  >
                    {status === 'all' ? 'All Runs' : status}
                  </Button>
                ))}
              </div>

              {filteredItems.length === 0 ? (
                <Card className="brutal-block flex flex-col items-center justify-center gap-3 p-12 text-center">
                  <div className="flex size-10 items-center justify-center border border-border/70 bg-muted text-muted-foreground rounded-lg">
                    <FileText className="size-4.5" />
                  </div>
                  <p className="text-xs font-semibold text-foreground/80">No runs match this filter</p>
                </Card>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredItems.map((item, i) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: i * 0.04 }}
                    >
                      <Card 
                        onClick={() => handleRestore(item.id)}
                        className="brutal-block group relative flex flex-col justify-between overflow-hidden p-4 cursor-pointer hover:border-primary/80 transition-all h-[360px]"
                      >
                        <div className="space-y-3">
                          {/* Thumbnail Diagram */}
                          <div className="relative aspect-video w-full overflow-hidden border border-border/40 rounded-lg bg-muted/20">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                              src={item.dataUrl} 
                              alt={item.filename}
                              className="h-full w-full object-cover transition-transform group-hover:scale-105 duration-300"
                              loading="lazy"
                            />
                            <div className="absolute top-2 right-2 flex items-center gap-1.5">
                              <span className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border",
                                item.status === 'completed' && "bg-emerald-500/10 border-emerald-500/30 text-emerald-500",
                                item.status === 'running' && "bg-amber-500/10 border-amber-500/30 text-amber-500 animate-pulse",
                                item.status === 'failed' && "bg-destructive/10 border-destructive/30 text-destructive"
                              )}>
                                <span className={cn(
                                  "size-1 rounded-full",
                                  item.status === 'completed' && "bg-emerald-500",
                                  item.status === 'running' && "bg-amber-500",
                                  item.status === 'failed' && "bg-destructive"
                                )} />
                                {item.status}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <h3 className="truncate text-xs font-bold leading-tight uppercase tracking-wide group-hover:text-primary transition-colors">
                              {item.filename}
                            </h3>
                            <p className="text-[9px] text-muted-foreground">
                              {new Date(item.createdAt).toLocaleString(undefined, {
                                dateStyle: 'medium',
                                timeStyle: 'short'
                              })}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-2 border-t border-border/30 pt-2.5 text-[10px] font-medium text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <HelpCircle className="size-3 text-muted-foreground/60" />
                              <span className="truncate">{item.bloomLevel} Level</span>
                            </div>
                            <div className="flex items-center gap-1 justify-end">
                              <QuestionIcon className="size-3 text-muted-foreground/60" />
                              <span>{item.qaCount} Questions</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <FileText className="size-3 text-muted-foreground/60" />
                              <span className="truncate">{item.diagramType || 'diagram'}</span>
                            </div>
                            <div className="flex items-center gap-1 justify-end">
                              <Bot className="size-3 text-muted-foreground/60" />
                              <span className="truncate font-mono">{item.provider || 'default'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 border-t border-border/30 pt-3 flex items-center justify-between gap-2">
                          <button
                            onClick={(e) => handleDelete(e, item.id)}
                            className="border border-border/40 rounded p-1.5 text-muted-foreground hover:border-destructive/30 hover:bg-destructive/15 hover:text-destructive transition-all"
                            aria-label="Delete run record"
                          >
                            <Trash2 className="size-3" />
                          </button>

                          <Button 
                            size="sm" 
                            onClick={(e) => { e.stopPropagation(); handleRestore(item.id) }}
                            disabled={restoringId === item.id}
                            className="gap-1 rounded-full text-[10px] h-8 font-bold brutal-interactive"
                          >
                            {restoringId === item.id ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <>Open in Console<ArrowRight className="size-3" /></>
                            )}
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
