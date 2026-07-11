'use client'

/**
 * usePipelineStream — wires the SSE connection to the Zustand store.
 *
 * Replaces usePipelineSocket. Listens for named SSE events:
 *   - `stage`  → dispatches to `applyStageEvent`
 *   - `log`    → dispatches to `appendLog`
 *
 * Opening the stream (via openPipelineStream) both starts the pipeline
 * server-side and begins receiving events — there's no separate "start"
 * call the way there was with Socket.io's `pipeline:start` emit.
 *
 * Resilience: the server persists each stage's output to the Run row as
 * it completes (see /api/runs/[id]/stream). If the EventSource errors
 * out before a terminal state is reached (e.g. a dropped connection or
 * a proxy that doesn't like long-lived SSE), this hook falls back to
 * polling GET /api/runs/[id] every 2s until the run reaches a terminal
 * status, so the user's progress is never silently lost.
 *
 * The orchestrator's `page.tsx` should call this hook once at the top
 * level so listeners are live for the whole page lifetime.
 */

import { useEffect, useRef, useState } from 'react'
import { openPipelineStream, closePipelineStream } from '@/lib/pipeline-stream'
import { usePipelineStore } from '@/lib/store'
import type { StageEvent, LogLine, RunRecord } from '@/lib/types'

const POLL_INTERVAL_MS = 2000

export function usePipelineStream(): { connected: boolean } {
  const [connected, setConnected] = useState(false)
  const applyStageEvent = usePipelineStore((s) => s.applyStageEvent)
  const appendLog = usePipelineStore((s) => s.appendLog)
  const runId = usePipelineStore((s) => s.runId)
  const running = usePipelineStore((s) => s.running)
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  // 1. Open the SSE stream for the active run and wire up listeners.
  useEffect(() => {
    if (!runId || !running) return

    const source = openPipelineStream(runId)

    const onOpen = () => setConnected(true)
    const onStage = (e: MessageEvent) => {
      const ev = JSON.parse(e.data) as StageEvent
      applyStageEvent(ev)
    }
    const onLog = (e: MessageEvent) => {
      const line = JSON.parse(e.data) as Omit<LogLine, 'id' | 'timestamp'>
      appendLog(line)
    }
    const onError = () => {
      setConnected(false)
      // EventSource auto-reconnects on transient errors, but if the
      // server already closed the stream (run finished, or genuinely
      // dropped), start polling as a safety net so the UI doesn't get
      // stuck in "running" forever.
      startPolling()
    }

    source.addEventListener('open', onOpen)
    source.addEventListener('stage', onStage)
    source.addEventListener('log', onLog)
    source.addEventListener('error', onError)

    return () => {
      source.removeEventListener('open', onOpen)
      source.removeEventListener('stage', onStage)
      source.removeEventListener('log', onLog)
      source.removeEventListener('error', onError)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId, running])

  // 2. Close the stream once the run is no longer active.
  useEffect(() => {
    if (!running) closePipelineStream()
  }, [running])

  // 3. Polling fallback.
  function startPolling() {
    if (!runId || pollTimer.current) return
    pollTimer.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/runs/${runId}`)
        if (!res.ok) return
        const record = (await res.json()) as RunRecord
        if (record.status === 'completed' || record.status === 'failed') {
          usePipelineStore.getState().hydrateFromHistory({
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
          if (pollTimer.current) {
            clearInterval(pollTimer.current)
            pollTimer.current = null
          }
        }
      } catch (err) {
        console.error('[pipeline poll]', err)
      }
    }, POLL_INTERVAL_MS)
  }

  useEffect(() => {
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current)
    }
  }, [])

  return { connected }
}
