'use client'

/**
 * ExtractionStage — Vision agent output.
 *
 * Reads `extraction` (ExtractionOutput | null), `stages.extraction.status`,
 * and the source diagram data URL.
 *
 * - idle + no data → EmptyState
 * - running + no data → RunningShimmer
 * - has data → preview thumbnail + summary, MiniGraph, two-column
 *   entities/relationships lists (ScrollArea, max-h-96), and a stats row.
 */

import * as React from 'react'
import { Loader2, FileText, ScanEye, ArrowRight } from 'lucide-react'
import { usePipelineStore } from '@/lib/store'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { StageFrame, EmptyState, DataChip } from './shared'
import { AgentThinkingConsole } from './AgentThinkingConsole'
import { MiniGraph } from './MiniGraph'
import { CountUpText } from '@/hooks/use-count-up'
import { ExtractionEditor } from './ExtractionEditor'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function ExtractionStage() {
  const extraction = usePipelineStore((s) => s.extraction)
  const status = usePipelineStore((s) => s.stages.extraction.status)
  const diagramDataUrl = usePipelineStore((s) => s.diagramDataUrl)
  const diagramFilename = usePipelineStore((s) => s.diagramFilename)
  const runId = usePipelineStore((s) => s.runId)
  
  const [isEditing, setIsEditing] = React.useState(false)

  const proceedToGeneration = async () => {
    if (!runId) return
    try {
      const res = await fetch(`/api/runs/${runId}/reset-stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: 'generation' }),
      })
      if (!res.ok) throw new Error()
      
      usePipelineStore.setState({
        running: true,
        completed: false,
        failed: false,
        errorMessage: null,
        activeStage: 'generation',
        questions: [],
        answers: [],
        verification: [],
        finalQA: [],
      })
      toast.success('Starting question generation with corrected extraction...')
    } catch {
      toast.error('Failed to trigger question generation')
    }
  }

  return (
    <StageFrame stageId="extraction">
      {!extraction && status === 'idle' && (
        <EmptyState
          title="Waiting for source diagram"
          hint="The vision agent will start once a diagram is uploaded and the pipeline begins."
          icon={ScanEye}
        />
      )}

      {!extraction && status === 'running' && (
        <AgentThinkingConsole stageId="extraction" label="Vision agent parsing diagram…" />
      )}

      {!extraction && status === 'error' && (
        <EmptyState
          title="Extraction failed"
          hint="The vision agent could not parse this diagram. Try a clearer image or start a new run."
          icon={FileText}
        />
      )}

      {extraction && (
        <div className="space-y-6">
          {isEditing ? (
            <ExtractionEditor
              runId={runId || ''}
              initialData={extraction}
              onClose={() => setIsEditing(false)}
            />
          ) : (
            <>
              <div className="flex justify-end gap-2.5">
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  🛠️ Correct Ingested Graph
                </Button>
                <Button size="sm" onClick={proceedToGeneration} className="gap-1.5 font-bold">
                  Proceed to Generation <ArrowRight className="size-3.5" />
                </Button>
              </div>

              {/* ---- Top: thumbnail + summary ---- */}
              <Card className="overflow-hidden p-0">
            <div className="grid gap-0 md:grid-cols-[260px_minmax(0,1fr)]">
              <div className="flex items-center justify-center border-b border-border/40 bg-muted p-4 md:border-b-0 md:border-r border-border/40">
                {diagramDataUrl && diagramDataUrl.startsWith('data:image') ? (
                  <img
                    src={diagramDataUrl}
                    alt="Source diagram"
                    className="max-h-[300px] w-auto max-w-full object-contain"
                  />
                ) : (
                  <div className="flex h-32 flex-col items-center justify-center gap-2 text-muted-foreground">
                    <FileText className="size-8" />
                    <span className="text-xs">PDF source</span>
                  </div>
                )}
              </div>
              <div className="space-y-3 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <DataChip tone="emerald">{extraction.diagramType}</DataChip>
                  <DataChip>
                    <CountUpText value={extraction.entities.length} duration={700} />{' '}
                    entities
                  </DataChip>
                  <DataChip>
                    <CountUpText value={extraction.relationships.length} duration={700} />{' '}
                    relationships
                  </DataChip>
                  {status === 'running' && (
                    <DataChip tone="amber">
                      <Loader2 className="size-2.5 animate-spin" />
                      updating
                    </DataChip>
                  )}
                </div>
                <p className="text-sm font-medium text-muted-foreground">{extraction.summary}</p>
                {extraction.layoutNotes && (
                  <p className="border-l-2 border-border pl-3 text-xs font-medium italic text-muted-foreground">
                    Layout: {extraction.layoutNotes}
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* ---- MiniGraph ---- */}
          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase">Extracted graph</h3>
              <DataChip>live preview</DataChip>
            </div>
            <MiniGraph extraction={extraction} />
          </Card>

          {/* ---- Entities / Relationships ---- */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="flex flex-col p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase">Entities</h3>
                <DataChip>{extraction.entities.length}</DataChip>
              </div>
              <ScrollArea className="max-h-96 pr-3">
                <ul className="space-y-2">
                  {extraction.entities.map((e) => (
                    <li
                      key={e.id}
                      className="border border-border/70 rounded bg-muted/65 px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-bold">{e.label}</span>
                        <DataChip>{e.type}</DataChip>
                      </div>
                      {e.role && (
                        <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">
                          {e.role}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </Card>

            <Card className="flex flex-col p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase">Relationships</h3>
                <DataChip>{extraction.relationships.length}</DataChip>
              </div>
              <ScrollArea className="max-h-96 pr-3">
                <ul className="space-y-2">
                  {extraction.relationships.map((r, i) => (
                    <li
                      key={i}
                      className="border border-border/70 rounded bg-muted/65 px-3 py-2"
                    >
                      <div className="flex flex-wrap items-center gap-1.5 text-sm">
                        <span className="font-bold">{r.from}</span>
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-secondary">
                          <span className="font-mono">—{r.label}→</span>
                          <ArrowRight className="size-3" />
                        </span>
                        <span className="font-bold">{r.to}</span>
                        {r.kind && <DataChip>{r.kind}</DataChip>}
                      </div>
                    </li>
                  ))}
                  {extraction.relationships.length === 0 && (
                    <li className="border border-dashed border-border px-3 py-4 text-center text-xs font-bold text-muted-foreground rounded">
                      No relationships detected.
                    </li>
                  )}
                </ul>
              </ScrollArea>
            </Card>
          </div>

          {status === 'running' && (
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
              <Loader2 className="size-3 animate-spin text-foreground" />
              <span>Updating with latest extraction…</span>
            </div>
          )}
            </>
          )}
        </div>
      )}
    </StageFrame>
  )
}
