/**
 * AR2-DDCQG pipeline mini-service.
 *
 * Socket.io server on port 3003 (path "/" — the Caddy gateway routes
 * via ?XTransformPort=3003). Orchestrates the four-agent pipeline and
 * streams live `stage` + `log` events to the connected client.
 *
 *   client → server:  pipeline:start  { runId, imageDataUrl, bloomLevel, filename }
 *   server → client:  stage           StageEvent
 *   server → client:  log             LogLine (minus id/timestamp)
 */

import { createServer } from 'http'
import { Server } from 'socket.io'
import type { Socket } from 'socket.io'
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
} from '../../src/lib/types.js'
import {
  runExtraction,
  runGeneration,
  runAnswering,
  runVerification,
  curateFinalQA,
  type Emit,
} from './agents.js'

const PORT = 3003

const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
})

interface StartPayload {
  runId: string
  imageDataUrl: string
  bloomLevel: BloomLevel
  filename: string
}

function now() {
  return Date.now()
}

/** Emit a stage status event to the client. */
function emitStage(
  socket: Socket,
  runId: string,
  stage: StageId,
  status: StageStatus,
  message?: string,
  data?: StageEvent['data']
) {
  const ev: StageEvent = { runId, stage, status, message, data, timestamp: now() }
  socket.emit('stage', ev)
}

/** Build an emit() helper bound to a socket+runId+stage for log lines. */
function makeLogger(
  socket: Socket,
  runId: string,
  stage: StageId
): Emit {
  return (level, text) => {
    socket.emit('log', { runId, stage, level, text })
  }
}

async function runPipeline(socket: Socket, payload: StartPayload) {
  const { runId, imageDataUrl, bloomLevel, filename } = payload
  const log = (stage: StageId, level: 'info' | 'warn' | 'error' | 'success', text: string) =>
    socket.emit('log', { runId, stage, level, text })

  log('extraction', 'info', `Run ${runId.slice(0, 8)} started — “${filename}” · Bloom: ${bloomLevel}`)

  try {
    /* ---- Extraction ---- */
    emitStage(socket, runId, 'extraction', 'running', 'Vision agent parsing diagram…')
    const extraction: ExtractionOutput = await runExtraction(
      imageDataUrl,
      makeLogger(socket, runId, 'extraction')
    )
    emitStage(socket, runId, 'extraction', 'done', 'Diagram parsed', extraction)

    /* ---- Generation ---- */
    emitStage(socket, runId, 'generation', 'running', `Generating ${bloomLevel}-level questions…`)
    const questions: GeneratedQuestion[] = await runGeneration(
      extraction,
      bloomLevel,
      makeLogger(socket, runId, 'generation')
    )
    emitStage(socket, runId, 'generation', 'done', `${questions.length} questions generated`, questions)

    /* ---- Answering ---- */
    emitStage(socket, runId, 'answering', 'running', 'Answering independently from the diagram…')
    const answers: GeneratedAnswer[] = await runAnswering(
      extraction,
      questions,
      makeLogger(socket, runId, 'answering')
    )
    emitStage(socket, runId, 'answering', 'done', `${answers.length} independent answers produced`, answers)

    /* ---- Verification ---- */
    emitStage(socket, runId, 'verification', 'running', 'Verifying Q&A pairs…')
    const verdicts: VerificationVerdict[] = await runVerification(
      extraction,
      questions,
      answers,
      makeLogger(socket, runId, 'verification')
    )
    // If any rejected, note a regeneration hint (visual only — we keep the run for transparency)
    const rejected = verdicts.filter((v) => v.status === 'reject')
    const vStatus: StageStatus = rejected.length > 0 ? 'flagged' : 'done'
    emitStage(
      socket,
      runId,
      'verification',
      vStatus,
      rejected.length > 0
        ? `${rejected.length} question(s) rejected — flagged for review`
        : 'All Q&A pairs verified',
      verdicts
    )

    /* ---- Curation / Results ---- */
    log('results', 'info', 'Curating verified question set…')
    const finalQA: FinalQAItem[] = curateFinalQA(questions, answers, verdicts)
    // Small beat so the UI can show the "curating" state
    await new Promise((r) => setTimeout(r, 500))
    emitStage(
      socket,
      runId,
      'results',
      'done',
      `${finalQA.length} verified questions ready`,
      finalQA
    )
    log('results', 'success', `Pipeline complete — ${finalQA.length} curated Q&A items`)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown pipeline error'
    console.error(`[pipeline ${runId}] failed:`, err)
    log('extraction', 'error', `Pipeline failed: ${message}`)
    emitStage(socket, runId, 'extraction', 'error', message)
  }
}

io.on('connection', (socket) => {
  console.log(`[pipeline] client connected: ${socket.id}`)

  socket.on('pipeline:start', (payload: StartPayload) => {
    if (!payload?.runId || !payload?.imageDataUrl || !payload?.bloomLevel) {
      socket.emit('stage', {
        runId: payload?.runId ?? 'unknown',
        stage: 'extraction',
        status: 'error',
        message: 'Invalid pipeline:start payload',
        data: null,
        timestamp: now(),
      } as StageEvent)
      return
    }
    console.log(`[pipeline] start run ${payload.runId.slice(0, 8)} (${payload.bloomLevel})`)
    // Fire and forget — events stream back over the same socket.
    runPipeline(socket, payload).catch((err) => {
      console.error(`[pipeline ${payload.runId}] uncaught:`, err)
      emitStage(socket, payload.runId, 'extraction', 'error', String(err?.message ?? err))
    })
  })

  socket.on('disconnect', () => {
    console.log(`[pipeline] client disconnected: ${socket.id}`)
  })

  socket.on('error', (err) => {
    console.error(`[pipeline] socket error (${socket.id}):`, err)
  })
})

httpServer.listen(PORT, () => {
  console.log(`AR2-DDCQG pipeline service listening on port ${PORT}`)
})

process.on('SIGTERM', () => {
  console.log('[pipeline] SIGTERM, shutting down…')
  io.close()
  httpServer.close(() => process.exit(0))
})
process.on('SIGINT', () => {
  console.log('[pipeline] SIGINT, shutting down…')
  io.close()
  httpServer.close(() => process.exit(0))
})
