// AR2-DDCQG shared type contracts.
// These are the canonical types used across the frontend store, the
// pipeline mini-service and the Next.js API routes. Do not rename fields
// without updating every consumer.

export type StageId =
  | 'upload'
  | 'extraction'
  | 'generation'
  | 'answering'
  | 'verification'
  | 'results'

export type StageStatus = 'idle' | 'running' | 'done' | 'flagged' | 'error'

export type BloomLevel =
  | 'Remember'
  | 'Understand'
  | 'Apply'
  | 'Analyze'
  | 'Evaluate'
  | 'Create'

export const BLOOM_LEVELS: BloomLevel[] = [
  'Remember',
  'Understand',
  'Apply',
  'Analyze',
  'Evaluate',
  'Create',
]

export const STAGE_ORDER: StageId[] = [
  'upload',
  'extraction',
  'generation',
  'answering',
  'verification',
  'results',
]

export interface StageMeta {
  id: StageId
  label: string
  short: string
  agent: string
  description: string
}

export const STAGES: StageMeta[] = [
  {
    id: 'upload',
    label: 'Source Diagram',
    short: 'Upload',
    agent: 'Ingest',
    description: 'Upload an architecture diagram, flowchart or circuit schematic.',
  },
  {
    id: 'extraction',
    label: 'Extraction',
    short: 'Extract',
    agent: 'Vision Agent',
    description: 'Parses the diagram into entities, relationships and spatial layout.',
  },
  {
    id: 'generation',
    label: 'Question Generation',
    short: 'Generate',
    agent: 'Generator Agent',
    description: 'Generates Bloom’s-taxonomy conditioned questions from the structure.',
  },
  {
    id: 'answering',
    label: 'Answering',
    short: 'Answer',
    agent: 'Solver Agent',
    description: 'Independently answers each question using only the diagram.',
  },
  {
    id: 'verification',
    label: 'Verification Loop',
    short: 'Verify',
    agent: 'Critic Agent',
    description: 'Checks Q&A pairs for correctness, ambiguity and label accuracy.',
  },
  {
    id: 'results',
    label: 'Results & History',
    short: 'Results',
    agent: 'Curator',
    description: 'Surfaces the curated, verified question set and run history.',
  },
]

// ---- Pipeline data shapes ----

export interface ExtractedEntity {
  id: string
  label: string
  type: string
  role?: string
}

export interface ExtractedRelationship {
  from: string
  to: string
  label: string
  kind?: string
}

export interface ExtractionOutput {
  diagramType: string
  summary: string
  entities: ExtractedEntity[]
  relationships: ExtractedRelationship[]
  layoutNotes?: string
}

export type QuestionType = 'short-answer' | 'mcq'

export interface GeneratedQuestion {
  id: string
  text: string
  bloomLevel: BloomLevel
  cognitiveSkill: string
  targets: string[]
  /** 'mcq' when the run was generated in MCQ-only mode; otherwise short-answer. */
  questionType?: QuestionType
  /** MCQ only: the answer choices, in display order. */
  options?: string[]
  /** MCQ only: index into `options` of the correct choice. */
  correctOptionIndex?: number
}

export interface GeneratedAnswer {
  questionId: string
  answer: string
  reasoning: string
  confidence: number
  /** MCQ only: index into the question's `options` the solver picked. */
  selectedOptionIndex?: number
}

export interface VerificationVerdict {
  questionId: string
  status: 'pass' | 'reject' | 'flagged'
  correctness: 'correct' | 'partial' | 'incorrect'
  ambiguity: boolean
  difficultyAccurate: boolean
  leakRisk: boolean
  issues: string[]
  suggestion?: string
}

export interface FinalQAItem {
  id: string
  question: string
  answer: string
  bloomLevel: BloomLevel
  cognitiveSkill: string
  verification: 'pass' | 'flagged'
  score: number
  questionType?: QuestionType
  options?: string[]
  correctOptionIndex?: number
}

// ---- Live socket events ----

export interface StageEvent {
  runId: string
  stage: StageId
  status: StageStatus
  message?: string
  /** Which AI provider actually served this stage's model call, once known. */
  provider?: string
  /** The specific model id used, once known. */
  model?: string
  /** Stage-specific payload, already parsed. */
  data?:
    | ExtractionOutput
    | GeneratedQuestion[]
    | GeneratedAnswer[]
    | VerificationVerdict[]
    | FinalQAItem[]
    | null
  timestamp: number
}

export interface LogLine {
  id: string
  runId: string
  stage: StageId
  level: 'info' | 'warn' | 'error' | 'success'
  text: string
  timestamp: number
}

export interface RunRecord {
  id: string
  diagramId: string
  filename: string
  dataUrl: string
  bloomLevel: BloomLevel
  status: 'running' | 'completed' | 'failed'
  /** AI provider selected for this run (built-in id or `custom:<id>`), if any. */
  provider?: string
  diagramType?: string
  extraction?: ExtractionOutput
  questions?: GeneratedQuestion[]
  answers?: GeneratedAnswer[]
  verification?: VerificationVerdict[]
  finalQA?: FinalQAItem[]
  errorMessage?: string
  startedAt?: string
  completedAt?: string
  durationMs?: number
  createdAt: string
}

// ---- API request/response ----

export interface CreateRunResponse {
  runId: string
  diagramId: string
}
