'use client'

/**
 * SSE connection to /api/runs/[id]/stream — replaces the old singleton
 * Socket.io connection to the standalone pipeline mini-service.
 *
 * Unlike the old socket, this is inherently per-run (an EventSource is
 * opened against a specific runId's URL), which is actually a
 * correctness improvement over the previous global-socket model: there
 * is no "wait for connect, then emit pipeline:start" dance, and no risk
 * of a stray event from a previous run leaking into a new one.
 *
 * Opening the connection IS the start signal — the server route starts
 * the pipeline as soon as the GET request comes in (or replays terminal
 * state if the run already finished).
 */

let activeSource: EventSource | null = null
let activeRunId: string | null = null

export function openPipelineStream(runId: string): EventSource {
  if (activeSource && activeRunId === runId) return activeSource
  closePipelineStream()
  activeSource = new EventSource(`/api/runs/${runId}/stream`)
  activeRunId = runId
  return activeSource
}

export function closePipelineStream() {
  if (activeSource) {
    activeSource.close()
    activeSource = null
    activeRunId = null
  }
}
