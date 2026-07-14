import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { assertRunAccess } from '@/lib/api'
import {
  runExtraction,
  runGeneration,
  runAnswering,
  runVerification,
  curateFinalQA,
} from '@/lib/pipeline/agents'
import type {
  StageId,
  StageStatus,
  StageEvent,
  BloomLevel,
  ExtractionOutput,
  GeneratedQuestion,
  GeneratedAnswer,
  VerificationVerdict,
  FinalQAItem,
} from '@/lib/types'

/**
 * GET /api/runs/[id]/stream
 *
 * SSE replacement for the old Socket.io pipeline mini-service. Opening
 * this connection both starts the pipeline (if the run hasn't already
 * been processed) and streams `stage` / `log` events to the client in
 * the same shape the old socket emitted, so the frontend store logic
 * (applyStageEvent / appendLog) is unchanged.
 *
 * Each stage's output is written to the Run row as soon as it completes
 * (not just at the very end), so a dropped connection can always be
 * recovered by polling GET /api/runs/[id] instead.
 *
 * maxDuration is set to 300s (Vercel Hobby + Fluid Compute ceiling) via
 * vercel.json's `functions` entry, matching the existing convention
 * used by /api/chat/stream. Four sequential LLM calls should comfortably
 * finish well under that; if a run is regularly taking anywhere close
 * to it, that's a signal something upstream is hanging, not that this
 * budget is too tight.
 */

function sseFrame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: runId } = await ctx.params
  const session = await getSession()
  const { run, response } = await assertRunAccess(runId, session, true)
  if (response) {
    return new Response(JSON.stringify(await response.json()), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  if (!run) {
    return new Response(JSON.stringify({ error: 'Run not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk))
        } catch {
          // controller already closed (client disconnected) — ignore
        }
      }

      const emitStage = (
        stage: StageId,
        status: StageStatus,
        message?: string,
        data?: StageEvent['data'],
        provider?: string,
        model?: string
      ) => {
        const ev: StageEvent = {
          runId,
          stage,
          status,
          message,
          data,
          provider,
          model,
          timestamp: Date.now(),
        }
        send(sseFrame('stage', ev))
      }

      // Tracks the most recently reported provider/model per stage, parsed
      // out of the "[provider] name (model)" log lines each agent emits
      // right after its model call returns. Populated by emitLog below and
      // read back when a stage's `done` event is sent.
      const lastProvider: Partial<Record<StageId, { provider: string; model: string }>> = {}

      const emitLog = (
        stage: StageId,
        level: 'info' | 'warn' | 'error' | 'success',
        text: string
      ) => {
        const match = /^\[provider\]\s+(\S+)\s+\(([^)]+)\)$/.exec(text)
        if (match) {
          lastProvider[stage] = { provider: match[1], model: match[2] }
        }
        send(sseFrame('log', { runId, stage, level, text }))
      }

      // If this run already finished (e.g. client reconnected after
      // completion), replay the terminal state instead of re-running.
      if (run.status === 'completed' || run.status === 'failed') {
        if (run.status === 'completed') {
          emitStage(
            'results',
            'done',
            'Run already completed',
            run.finalQA ? JSON.parse(run.finalQA) : []
          )
        } else {
          // Older failed runs (from before failedStage existed) won't
          // have this set — 'extraction' remains a reasonable fallback
          // for those, but any run that fails from now on reports the
          // stage it actually failed at.
          const validStages: StageId[] = ['extraction', 'generation', 'answering', 'verification', 'results']
          const stage = validStages.includes(run.failedStage as StageId)
            ? (run.failedStage as StageId)
            : 'extraction'
          emitStage(stage, 'error', run.errorMessage ?? 'Pipeline previously failed')
        }
        controller.close()
        return
      }

      const bloomLevel = run.bloomLevel as BloomLevel
      const imageDataUrl = run.diagram.dataUrl
      const filename = run.diagram.filename
      const providerId = run.provider ?? undefined
      const userId = run.userId ?? undefined
      const questionCount = run.questionCount ?? 4
      const mcqOnly = run.mcqOnly === true

      // Tracks which stage is actually in flight so a failure can be
      // attributed correctly. Previously the catch block always reported
      // errors against 'extraction' regardless of which stage actually
      // threw — if verification failed, the UI would misleadingly show
      // extraction as the broken stage.
      let currentStage: StageId = 'extraction'

      emitLog(
        'extraction',
        'info',
        `Run ${runId.slice(0, 8)} started — "${filename}" · Bloom: ${bloomLevel}` +
          (providerId ? ` · Provider: ${providerId}` : '') +
          ` · ${questionCount} question${questionCount === 1 ? '' : 's'}${mcqOnly ? ' (MCQ)' : ''}`
      )

      try {
        /* ---- Extraction ---- */
        let extraction: ExtractionOutput
        if (run.extraction) {
          extraction = JSON.parse(run.extraction) as ExtractionOutput
          emitLog('extraction', 'info', 'Loaded diagram extraction from cache')
          emitStage('extraction', 'done', 'Diagram parsed (cached)', extraction)
        } else {
          currentStage = 'extraction'
          emitStage('extraction', 'running', 'Vision agent parsing diagram…')
          extraction = await runExtraction(
            imageDataUrl,
            (level, text) => emitLog('extraction', level, text),
            providerId,
            userId
          )
          await db.run.update({
            where: { id: runId },
            data: {
              diagramType: extraction.diagramType,
              extraction: JSON.stringify(extraction),
            },
          })
          emitStage(
            'extraction',
            'done',
            'Diagram parsed',
            extraction,
            lastProvider.extraction?.provider,
            lastProvider.extraction?.model
          )
        }

        /* ---- Generation ---- */
        let questions: GeneratedQuestion[]
        if (run.questions) {
          questions = JSON.parse(run.questions) as GeneratedQuestion[]
          emitLog('generation', 'info', `Loaded ${questions.length} generated questions from cache`)
          emitStage('generation', 'done', `${questions.length} questions generated (cached)`, questions)
        } else {
          currentStage = 'generation'
          emitStage('generation', 'running', `Generating ${bloomLevel}-level questions…`)
          questions = await runGeneration(
            extraction,
            bloomLevel,
            (level, text) => emitLog('generation', level, text),
            providerId,
            userId,
            questionCount,
            mcqOnly
          )
          await db.run.update({
            where: { id: runId },
            data: { questions: JSON.stringify(questions) },
          })
          emitStage(
            'generation',
            'done',
            `${questions.length} questions generated`,
            questions,
            lastProvider.generation?.provider,
            lastProvider.generation?.model
          )
        }

        /* ---- Answering ---- */
        let answers: GeneratedAnswer[]
        if (run.answers) {
          answers = JSON.parse(run.answers) as GeneratedAnswer[]
          emitLog('answering', 'info', `Loaded ${answers.length} independent answers from cache`)
          emitStage('answering', 'done', `${answers.length} answers produced (cached)`, answers)
        } else {
          currentStage = 'answering'
          emitStage('answering', 'running', 'Answering independently from the diagram…')
          answers = await runAnswering(
            extraction,
            questions,
            (level, text) => emitLog('answering', level, text),
            providerId,
            userId
          )
          await db.run.update({
            where: { id: runId },
            data: { answers: JSON.stringify(answers) },
          })
          emitStage(
            'answering',
            'done',
            `${answers.length} independent answers produced`,
            answers,
            lastProvider.answering?.provider,
            lastProvider.answering?.model
          )
        }

        /* ---- Verification ---- */
        let verdicts: VerificationVerdict[]
        if (run.verification) {
          verdicts = JSON.parse(run.verification) as VerificationVerdict[]
          emitLog('verification', 'info', 'Loaded verification verdicts from cache')
          const rejected = verdicts.filter((v) => v.status === 'reject')
          const vStatus: StageStatus = rejected.length > 0 ? 'flagged' : 'done'
          emitStage('verification', vStatus, 'Verification complete (cached)', verdicts)
        } else {
          currentStage = 'verification'
          emitStage('verification', 'running', 'Verifying Q&A pairs…')
          verdicts = await runVerification(
            extraction,
            questions,
            answers,
            (level, text) => emitLog('verification', level, text),
            providerId,
            userId
          )
          await db.run.update({
            where: { id: runId },
            data: { verification: JSON.stringify(verdicts) },
          })
          const rejected = verdicts.filter((v) => v.status === 'reject')
          const vStatus: StageStatus = rejected.length > 0 ? 'flagged' : 'done'
          emitStage(
            'verification',
            vStatus,
            rejected.length > 0
              ? `${rejected.length} question(s) rejected — flagged for review`
              : 'All Q&A pairs verified',
            verdicts,
            lastProvider.verification?.provider,
            lastProvider.verification?.model
          )
        }

        /* ---- Curation / Results ---- */
        currentStage = 'results'
        emitLog('results', 'info', 'Curating verified question set…')
        const finalQA: FinalQAItem[] = curateFinalQA(questions, answers, verdicts)
        // Small beat so the UI can show the "curating" state, matching
        // the pacing of the original Socket.io orchestrator.
        await new Promise((r) => setTimeout(r, 500))

        // Populate normalized Question table
        await db.question.deleteMany({ where: { runId } }).catch(() => undefined)
        for (const item of finalQA) {
          try {
            await db.question.create({
              data: {
                id: item.id,
                runId,
                bloomLevel: item.bloomLevel || bloomLevel,
                type: mcqOnly ? "MCQ" : "SHORT",
                text: item.question,
                options: mcqOnly ? JSON.stringify((questions.find(q => q.id === item.id) as any)?.options || []) : null,
                answer: item.answer,
                explanation: item.explanation || "",
                verificationScore: item.score ? Math.round(item.score * 100) : 100,
                verificationVerdict: (item.verification || 'pass').toUpperCase(),
                isApproved: item.verification !== 'reject',
              }
            })
          } catch (err) {
            console.error('Failed to save question during stream:', err)
          }
        }

        await db.run.update({
          where: { id: runId },
          data: {
            status: 'completed',
            finalQA: JSON.stringify(finalQA),
            completedAt: new Date(),
            durationMs: run.startedAt ? Date.now() - run.startedAt.getTime() : null,
          },
        })

        emitStage('results', 'done', `${finalQA.length} verified questions ready`, finalQA)
        emitLog('results', 'success', `Pipeline complete — ${finalQA.length} curated Q&A items`)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown pipeline error'
        console.error(`[pipeline ${runId}] failed at ${currentStage}:`, err)
        await db.run
          .update({
            where: { id: runId },
            data: {
              status: 'failed',
              errorMessage: message,
              failedStage: currentStage,
              completedAt: new Date(),
              durationMs: run.startedAt ? Date.now() - run.startedAt.getTime() : null,
            },
          })
          .catch((dbErr) => console.error(`[pipeline ${runId}] failed to persist error:`, dbErr))
        emitLog(currentStage, 'error', `Pipeline failed: ${message}`)
        emitStage(currentStage, 'error', message)
      } finally {
        controller.close()
      }
    },
    cancel() {
      // Client disconnected — the pipeline run already in flight above
      // will keep running server-side to completion (and persist to the
      // DB), it just won't have anywhere to stream to anymore. The
      // client can recover full state via GET /api/runs/[id] polling.
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
