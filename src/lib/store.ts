'use client'

import { create } from 'zustand'
import type {
  StageId,
  StageStatus,
  StageEvent,
  LogLine,
  ExtractionOutput,
  GeneratedQuestion,
  GeneratedAnswer,
  VerificationVerdict,
  FinalQAItem,
  BloomLevel,
} from './types'

export interface StageState {
  status: StageStatus
  message?: string
  startedAt?: number
  completedAt?: number
  /** Which AI provider (and model) actually served this stage, once known. */
  provider?: string
  model?: string
}

interface PipelineState {
  // run identity
  runId: string | null
  bloomLevel: BloomLevel
  /** Selected AI provider for the next run: a built-in id, `custom:<id>`, or null for auto. */
  selectedProvider: string | null
  /** How many questions to generate for the next run (1-20). */
  questionCount: number
  /** When true, the next run generates 4-option MCQ questions only. */
  mcqOnly: boolean

  // source diagram
  diagramFilename: string | null
  diagramDataUrl: string | null

  // stage states
  stages: Record<StageId, StageState>
  activeStage: StageId

  // stage outputs
  extraction: ExtractionOutput | null
  questions: GeneratedQuestion[]
  answers: GeneratedAnswer[]
  verification: VerificationVerdict[]
  finalQA: FinalQAItem[]

  // live log
  logs: LogLine[]

  // run-level
  running: boolean
  completed: boolean
  failed: boolean
  errorMessage: string | null

  // sidebar ui
  sidebarCollapsed: boolean
  /** Whether the follow-up chat panel is open. Lives in the store so the
   *  trigger button (in ResultsStage) and the panel itself (mounted at
   *  the page level) can share state without prop drilling. */
  chatOpen: boolean

  /* --- right-hand console dock ---
     The agent log and the follow-up chat used to float over the content
     as two separate overlays. They are now one docked rail with two
     tabs, so nothing covers the page and both are reachable from every
     stage. `chatOpen` is kept as an alias for "dock open on the chat
     tab" so existing call sites keep working. */
  dockOpen: boolean
  dockTab: 'log' | 'chat'

  // actions
  setBloomLevel: (b: BloomLevel) => void
  setSelectedProvider: (p: string | null) => void
  setQuestionCount: (n: number) => void
  setMcqOnly: (v: boolean) => void
  setDiagram: (filename: string, dataUrl: string) => void
  setRunId: (id: string | null) => void
  startRun: () => void
  resetRun: () => void
  applyStageEvent: (ev: StageEvent) => void
  appendLog: (line: Omit<LogLine, 'id' | 'timestamp'>) => void
  setSidebarCollapsed: (v: boolean) => void
  setChatOpen: (v: boolean) => void
  setDock: (open: boolean, tab?: 'log' | 'chat') => void
  toggleDock: (tab?: 'log' | 'chat') => void
  setActiveStage: (s: StageId) => void
  hydrateFromHistory: (payload: HydratePayload) => void
}

export interface HydratePayload {
  runId: string
  filename: string
  dataUrl: string
  bloomLevel: BloomLevel
  status: 'running' | 'completed' | 'failed'
  diagramType?: string
  extraction?: ExtractionOutput
  questions?: GeneratedQuestion[]
  answers?: GeneratedAnswer[]
  verification?: VerificationVerdict[]
  finalQA?: FinalQAItem[]
  errorMessage?: string
}

const emptyStages = (): Record<StageId, StageState> => ({
  upload: { status: 'idle' },
  extraction: { status: 'idle' },
  generation: { status: 'idle' },
  answering: { status: 'idle' },
  verification: { status: 'idle' },
  results: { status: 'idle' },
})

function nextActive(stage: StageId): StageId {
  const order: StageId[] = [
    'upload',
    'extraction',
    'generation',
    'answering',
    'verification',
    'results',
  ]
  const i = order.indexOf(stage)
  return i < order.length - 1 ? order[i + 1] : stage
}

export const usePipelineStore = create<PipelineState>((set) => ({
  runId: null,
  bloomLevel: 'Analyze',
  selectedProvider: null,
  questionCount: 4,
  mcqOnly: false,
  diagramFilename: null,
  diagramDataUrl: null,
  stages: emptyStages(),
  activeStage: 'upload',
  extraction: null,
  questions: [],
  answers: [],
  verification: [],
  finalQA: [],
  logs: [],
  running: false,
  completed: false,
  failed: false,
  errorMessage: null,
  sidebarCollapsed: false,
  chatOpen: false,
  dockOpen: false,
  dockTab: 'log',

  setBloomLevel: (b) => set({ bloomLevel: b }),
  setSelectedProvider: (p) => set({ selectedProvider: p }),
  setQuestionCount: (n) => set({ questionCount: Math.max(1, Math.min(20, Math.round(n))) }),
  setMcqOnly: (v) => set({ mcqOnly: v }),
  setDiagram: (filename, dataUrl) =>
    set({
      diagramFilename: filename,
      diagramDataUrl: dataUrl,
      stages: { ...emptyStages(), upload: { status: 'done', completedAt: Date.now() } },
      activeStage: 'extraction',
    }),
  setRunId: (id) => set({ runId: id }),

  startRun: () =>
    set({
      running: true,
      completed: false,
      failed: false,
      errorMessage: null,
      stages: {
        upload: { status: 'done', completedAt: Date.now() },
        extraction: { status: 'idle' },
        generation: { status: 'idle' },
        answering: { status: 'idle' },
        verification: { status: 'idle' },
        results: { status: 'idle' },
      },
      extraction: null,
      questions: [],
      answers: [],
      verification: [],
      finalQA: [],
      logs: [],
    }),

  resetRun: () =>
    set({
      runId: null,
      diagramFilename: null,
      diagramDataUrl: null,
      bloomLevel: 'Analyze',
      stages: emptyStages(),
      activeStage: 'upload',
      extraction: null,
      questions: [],
      answers: [],
      verification: [],
      finalQA: [],
      logs: [],
      running: false,
      completed: false,
      failed: false,
      errorMessage: null,
    }),

  applyStageEvent: (ev) =>
    set((state) => {
      const prev = state.stages[ev.stage]
      const stageUpdate: StageState = {
        status: ev.status,
        message: ev.message,
        startedAt:
          ev.status === 'running' ? ev.timestamp : prev?.startedAt,
        completedAt:
          ev.status === 'done' || ev.status === 'flagged' || ev.status === 'error'
            ? ev.timestamp
            : prev?.completedAt,
        provider: ev.provider ?? prev?.provider,
        model: ev.model ?? prev?.model,
      }
      const next: Partial<PipelineState> = {
        stages: { ...state.stages, [ev.stage]: stageUpdate },
      }

      if (ev.status === 'running' && ev.stage !== 'upload') {
        next.activeStage = ev.stage
      }

      // attach stage payload
      if (ev.stage === 'extraction' && ev.data) {
        next.extraction = ev.data as ExtractionOutput
      } else if (ev.stage === 'generation' && ev.data) {
        next.questions = ev.data as GeneratedQuestion[]
      } else if (ev.stage === 'answering' && ev.data) {
        next.answers = ev.data as GeneratedAnswer[]
      } else if (ev.stage === 'verification' && ev.data) {
        next.verification = ev.data as VerificationVerdict[]
      } else if (ev.stage === 'results' && ev.data) {
        next.finalQA = ev.data as FinalQAItem[]
      }

      // run-level transitions
      if (ev.stage === 'results' && ev.status === 'done') {
        next.running = false
        next.completed = true
        next.activeStage = 'results'
      }
      if (ev.status === 'error') {
        next.running = false
        next.failed = true
        next.errorMessage = ev.message ?? 'Pipeline error'
      }

      return next as PipelineState
    }),

  appendLog: (line) =>
    set((state) => {
      const ts = Date.now()
      return {
        logs: [
          ...state.logs,
          { ...line, id: `${line.stage}-${ts}-${Math.random().toString(36).slice(2, 7)}`, timestamp: ts },
        ].slice(-200),
      }
    }),

  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
  setChatOpen: (v) => set({ chatOpen: v, dockOpen: v, dockTab: v ? 'chat' : 'log' }),
  setDock: (open, tab) =>
    set((s) => ({
      dockOpen: open,
      dockTab: tab ?? s.dockTab,
      chatOpen: open && (tab ?? s.dockTab) === 'chat',
    })),
  toggleDock: (tab) =>
    set((s) => {
      // Clicking the tab you are already on closes the rail; clicking the
      // other tab switches to it without closing.
      const nextTab = tab ?? s.dockTab
      const open = s.dockOpen && s.dockTab === nextTab ? false : true
      return { dockOpen: open, dockTab: nextTab, chatOpen: open && nextTab === 'chat' }
    }),
  setActiveStage: (s) => set({ activeStage: s }),

  hydrateFromHistory: (payload) =>
    set({
      runId: payload.runId,
      diagramFilename: payload.filename,
      diagramDataUrl: payload.dataUrl,
      bloomLevel: payload.bloomLevel,
      running: false,
      completed: payload.status === 'completed',
      failed: payload.status === 'failed',
      errorMessage: payload.errorMessage ?? null,
      extraction: payload.extraction ?? null,
      questions: payload.questions ?? [],
      answers: payload.answers ?? [],
      verification: payload.verification ?? [],
      finalQA: payload.finalQA ?? [],
      stages: {
        upload: { status: 'done', completedAt: 0 },
        extraction: payload.extraction ? { status: 'done', completedAt: 0 } : { status: 'idle' },
        generation: payload.questions?.length ? { status: 'done', completedAt: 0 } : { status: 'idle' },
        answering: payload.answers?.length ? { status: 'done', completedAt: 0 } : { status: 'idle' },
        verification: payload.verification?.length ? { status: 'done', completedAt: 0 } : { status: 'idle' },
        results: payload.finalQA?.length ? { status: 'done', completedAt: 0 } : { status: 'idle' },
      },
      activeStage: payload.finalQA?.length
        ? 'results'
        : payload.status === 'failed'
        ? 'extraction'
        : 'results',
      logs: [],
    }),
}))
