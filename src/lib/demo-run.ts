'use client'

/**
 * demo-run — a fully self-contained, offline demonstration of the whole
 * AR2-DDCQG pipeline.
 *
 * WHY THIS EXISTS
 * ---------------
 * The real pipeline needs a vision-capable provider and a user API key.
 * That makes the product impossible to *show* to someone who has just
 * landed on it: the first thing they meet is a wall asking for a key to
 * something they have not been convinced of yet.
 *
 * The sample diagram therefore never touches the network. It replays a
 * scripted run — the same StageEvent / LogLine shapes the SSE stream
 * emits — on a timer, so every downstream surface (Extraction, Question
 * Generation, Answering, Verification, Results, the agent log rail and
 * the follow-up chatbot) lights up exactly as it would for a real run.
 *
 * Everything here is deterministic and local. No key, no account, no
 * database row, no tokens burned.
 */

import type {
  BloomLevel,
  ExtractionOutput,
  FinalQAItem,
  GeneratedAnswer,
  GeneratedQuestion,
  LogLine,
  StageEvent,
  VerificationVerdict,
} from './types'

/* ------------------------------------------------------------------ */
/* Identity                                                            */
/* ------------------------------------------------------------------ */

/** Run ids for scripted runs are prefixed so every consumer can spot one. */
export const DEMO_RUN_PREFIX = 'demo-'

export function isDemoRun(runId: string | null | undefined): boolean {
  return typeof runId === 'string' && runId.startsWith(DEMO_RUN_PREFIX)
}

export function newDemoRunId(): string {
  return `${DEMO_RUN_PREFIX}${Date.now().toString(36)}`
}

/* ------------------------------------------------------------------ */
/* The sample diagram                                                  */
/* ------------------------------------------------------------------ */

export const SAMPLE_DIAGRAM_NAME = 'sample-architecture.svg'

/**
 * Drawn in the RUBRIC palette: paper ground, ink rules, one red accent
 * for the optional path. Deliberately hand-drawn-ish weights so it reads
 * as a whiteboard sketch rather than a stock vector.
 */
export const SAMPLE_DIAGRAM_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='680' height='340' viewBox='0 0 680 340'>
  <defs>
    <marker id='ar' markerWidth='11' markerHeight='11' refX='9' refY='5.5' orient='auto'>
      <path d='M0,0 L11,5.5 L0,11 Z' fill='#0a0a0a'/>
    </marker>
    <marker id='arR' markerWidth='11' markerHeight='11' refX='9' refY='5.5' orient='auto'>
      <path d='M0,0 L11,5.5 L0,11 Z' fill='#e5342a'/>
    </marker>
  </defs>
  <rect x='0' y='0' width='680' height='340' fill='#efeae0'/>

  <rect x='36' y='150' width='150' height='70' fill='#fffdf8' stroke='#0a0a0a' stroke-width='3'/>
  <text x='111' y='182' text-anchor='middle' fill='#0a0a0a' font-family='Arial Black, sans-serif' font-size='16' font-weight='900'>CLIENT</text>
  <text x='111' y='201' text-anchor='middle' fill='#57534e' font-family='monospace' font-size='10'>browser · app</text>

  <rect x='265' y='150' width='150' height='70' fill='#fffdf8' stroke='#0a0a0a' stroke-width='3'/>
  <text x='340' y='177' text-anchor='middle' fill='#0a0a0a' font-family='Arial Black, sans-serif' font-size='15' font-weight='900'>API GATEWAY</text>
  <text x='340' y='198' text-anchor='middle' fill='#57534e' font-family='monospace' font-size='10'>auth · routing</text>

  <rect x='494' y='150' width='150' height='70' fill='#fffdf8' stroke='#0a0a0a' stroke-width='3'/>
  <text x='569' y='182' text-anchor='middle' fill='#0a0a0a' font-family='Arial Black, sans-serif' font-size='16' font-weight='900'>DATABASE</text>
  <text x='569' y='201' text-anchor='middle' fill='#57534e' font-family='monospace' font-size='10'>primary store</text>

  <rect x='265' y='40' width='150' height='58' fill='#fffdf8' stroke='#e5342a' stroke-width='3' stroke-dasharray='9 6'/>
  <text x='340' y='66' text-anchor='middle' fill='#e5342a' font-family='Arial Black, sans-serif' font-size='15' font-weight='900'>CACHE</text>
  <text x='340' y='85' text-anchor='middle' fill='#57534e' font-family='monospace' font-size='10'>optional · ttl 60s</text>

  <line x1='186' y1='185' x2='258' y2='185' stroke='#0a0a0a' stroke-width='3' marker-end='url(#ar)'/>
  <text x='222' y='174' text-anchor='middle' fill='#57534e' font-family='monospace' font-size='10'>request</text>

  <line x1='415' y1='185' x2='487' y2='185' stroke='#0a0a0a' stroke-width='3' marker-end='url(#ar)'/>
  <text x='451' y='174' text-anchor='middle' fill='#57534e' font-family='monospace' font-size='10'>query</text>

  <line x1='340' y1='150' x2='340' y2='105' stroke='#e5342a' stroke-width='3' stroke-dasharray='7 5' marker-end='url(#arR)'/>
  <text x='356' y='130' fill='#e5342a' font-family='monospace' font-size='10'>lookup</text>

  <line x1='36' y1='268' x2='644' y2='268' stroke='#0a0a0a' stroke-width='2'/>
  <text x='36' y='290' fill='#57534e' font-family='monospace' font-size='11'>AR2-DDCQG · SAMPLE ARCHITECTURE · 4 NODES · 3 EDGES</text>
</svg>`

export function sampleDiagramDataUrl(): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(SAMPLE_DIAGRAM_SVG)}`
}

/* ------------------------------------------------------------------ */
/* Extraction — what the Vision Agent "sees"                           */
/* ------------------------------------------------------------------ */

const DEMO_EXTRACTION: ExtractionOutput = {
  diagramType: 'Layered request-path architecture diagram',
  summary:
    'A three-tier synchronous request path. A client issues a request to an API gateway, which authenticates and routes it, then queries a primary datastore. An optional cache hangs off the gateway on a dashed edge with a 60-second TTL, sitting on the read path rather than beside the database.',
  entities: [
    { id: 'client', label: 'Client', type: 'actor', role: 'Originates every request; browser or native app.' },
    { id: 'gateway', label: 'API Gateway', type: 'service', role: 'Authenticates, routes, and fans out to the cache and the datastore.' },
    { id: 'cache', label: 'Cache', type: 'store', role: 'Optional read-through layer with a 60s TTL; drawn dashed.' },
    { id: 'database', label: 'Database', type: 'store', role: 'Primary system of record for all persisted state.' },
  ],
  relationships: [
    { from: 'client', to: 'gateway', label: 'request', kind: 'synchronous' },
    { from: 'gateway', to: 'database', label: 'query', kind: 'synchronous' },
    { from: 'gateway', to: 'cache', label: 'lookup', kind: 'optional' },
  ],
  layoutNotes:
    'Left-to-right flow on a single horizontal axis, with the one optional component lifted above the axis and rendered dashed — a conventional signal that the path is bypassable. Nothing returns: every edge is one-way, so the diagram documents request flow, not response flow.',
}

/* ------------------------------------------------------------------ */
/* The question bank — two per Bloom level                             */
/* ------------------------------------------------------------------ */

interface BankItem {
  bloomLevel: BloomLevel
  cognitiveSkill: string
  text: string
  targets: string[]
  answer: string
  reasoning: string
  confidence: number
  options: string[]
  correctOptionIndex: number
  verdict: VerificationVerdict['status']
  correctness: VerificationVerdict['correctness']
  issues: string[]
  suggestion?: string
  score: number
}

const BANK: BankItem[] = [
  /* ---------------- Remember ---------------- */
  {
    bloomLevel: 'Remember',
    cognitiveSkill: 'Recall of labelled components',
    text: 'List every component labelled in the diagram, and state which one is drawn as optional.',
    targets: ['Client', 'API Gateway', 'Cache', 'Database'],
    answer:
      'Four components are labelled: Client, API Gateway, Cache and Database. The Cache is the optional one — it is drawn with a dashed red outline and a dashed connector.',
    reasoning:
      'Enumerated the four boxes carrying text labels. Dashed strokes are the only stylistic difference in the diagram, and they are applied exclusively to the Cache box and its edge, which marks it as the optional element.',
    confidence: 0.97,
    options: [
      'Client, API Gateway, Cache, Database — Cache is optional',
      'Client, Server, Cache, Database — Server is optional',
      'Client, API Gateway, Database — there is no optional component',
      'Client, Load Balancer, Cache, Database — Cache is optional',
    ],
    correctOptionIndex: 0,
    verdict: 'pass',
    correctness: 'correct',
    issues: [],
    score: 0.96,
  },
  {
    bloomLevel: 'Remember',
    cognitiveSkill: 'Recall of edge direction',
    text: 'Which component does the Client send its request to, and what label sits on that edge?',
    targets: ['Client', 'API Gateway'],
    answer: 'The Client sends its request to the API Gateway. The edge is labelled "request".',
    reasoning:
      'A single arrow leaves the Client box; its head terminates on the API Gateway, and the text sitting above its midpoint reads "request".',
    confidence: 0.98,
    options: [
      'To the API Gateway, on an edge labelled "request"',
      'To the Database, on an edge labelled "query"',
      'To the Cache, on an edge labelled "lookup"',
      'To the API Gateway, on an edge labelled "query"',
    ],
    correctOptionIndex: 0,
    verdict: 'pass',
    correctness: 'correct',
    issues: [],
    score: 0.98,
  },

  /* ---------------- Understand ---------------- */
  {
    bloomLevel: 'Understand',
    cognitiveSkill: 'Explanation of a component’s role',
    text: 'In your own words, explain the role the API Gateway plays between the Client and the Database.',
    targets: ['API Gateway', 'Client', 'Database'],
    answer:
      'The API Gateway is the single mediating layer: the Client never touches the Database directly. The Gateway receives the request, authenticates and routes it, decides whether the Cache can satisfy it, and only then issues a query to the Database. It is the sole point at which policy is applied to a request.',
    reasoning:
      'The Client has exactly one outgoing edge and it terminates at the Gateway; the Database has exactly one incoming edge and it originates at the Gateway. There is no Client→Database edge, so all mediation is structural rather than incidental. The Gateway’s own sub-label ("auth · routing") names the two policies it applies.',
    confidence: 0.93,
    options: [
      'It mediates every request — authenticating, routing, and choosing between cache and database',
      'It stores a copy of the database so the client can read faster',
      'It is a passive network switch with no logic of its own',
      'It queues requests for later asynchronous processing',
    ],
    correctOptionIndex: 0,
    verdict: 'pass',
    correctness: 'correct',
    issues: [],
    score: 0.94,
  },
  {
    bloomLevel: 'Understand',
    cognitiveSkill: 'Interpretation of notation',
    text: 'The Cache and its connector are drawn dashed while every other element is solid. Explain what that notation is communicating.',
    targets: ['Cache'],
    answer:
      'Dashing marks the Cache as optional and bypassable. The system is correct without it — a request that misses the cache, or a deployment with no cache at all, still completes through the Gateway to the Database. Solid edges are the guaranteed path; the dashed one is a conditional shortcut.',
    reasoning:
      'The diagram uses stroke style as its only encoding channel beyond position. Since the solid path Client→Gateway→Database is complete on its own, the dashed branch cannot be load-bearing; dashing therefore reads as optionality, not as a different protocol.',
    confidence: 0.88,
    options: [
      'That the Cache is optional and the system still works without it',
      'That the Cache is the most important component in the system',
      'That the Cache connection is encrypted while the others are not',
      'That the Cache has not been built yet and is purely aspirational',
    ],
    correctOptionIndex: 0,
    verdict: 'flagged',
    correctness: 'correct',
    issues: ['Dashed notation is convention rather than a formal standard; a student could reasonably read it as "planned, not built".'],
    suggestion: 'Add a legend to the source diagram, or accept both readings when marking.',
    score: 0.79,
  },

  /* ---------------- Apply ---------------- */
  {
    bloomLevel: 'Apply',
    cognitiveSkill: 'Tracing a concrete execution path',
    text: 'A read request arrives for a record that was already fetched 15 seconds ago. Using only this diagram, trace the exact path the request takes and name the component that terminates it.',
    targets: ['Client', 'API Gateway', 'Cache'],
    answer:
      'Client → API Gateway → Cache. Because the Cache carries a 60-second TTL and the record is only 15 seconds old, the entry is still live, so the Gateway’s lookup hits and the request terminates at the Cache. The Database is never reached.',
    reasoning:
      'Applied the stated TTL of 60s to the given age of 15s: 15 < 60, therefore the entry has not expired. The Gateway performs the lookup before the query in the read path, so a hit short-circuits the Database edge entirely.',
    confidence: 0.91,
    options: [
      'Client → API Gateway → Cache; it terminates at the Cache (hit, entry still within TTL)',
      'Client → API Gateway → Database; the cache is only used for writes',
      'Client → Cache directly; the gateway is bypassed on reads',
      'Client → API Gateway → Cache → Database; both stores are always read',
    ],
    correctOptionIndex: 0,
    verdict: 'pass',
    correctness: 'correct',
    issues: [],
    score: 0.92,
  },
  {
    bloomLevel: 'Apply',
    cognitiveSkill: 'Extending a structure to a new case',
    text: 'A second, mobile client application must be added. Using only what the diagram shows, state exactly what has to change and what does not.',
    targets: ['Client', 'API Gateway'],
    answer:
      'Add one more Client box with a single "request" edge into the same API Gateway. Nothing downstream changes: the Gateway, Cache and Database are untouched, because every client already shares one entry point.',
    reasoning:
      'The diagram’s shape is a funnel — all traffic converges on the Gateway before diverging. Adding a producer at the wide end of a funnel does not alter the narrow end, so the change is purely additive at the Client tier.',
    confidence: 0.89,
    options: [
      'Add a second Client with its own edge to the same Gateway; nothing downstream changes',
      'Duplicate the entire stack, including a second Gateway and Database',
      'Connect the mobile client straight to the Database to reduce latency',
      'Add the mobile client to the Cache, since mobile reads should be cached',
    ],
    correctOptionIndex: 0,
    verdict: 'pass',
    correctness: 'correct',
    issues: [],
    score: 0.9,
  },

  /* ---------------- Analyze ---------------- */
  {
    bloomLevel: 'Analyze',
    cognitiveSkill: 'Decomposition and failure analysis',
    text: 'Decompose the request path into its stages and identify the single component whose failure takes down every request. Justify your choice from the diagram’s structure alone.',
    targets: ['API Gateway', 'Client', 'Database', 'Cache'],
    answer:
      'The API Gateway. Decomposed, the path is: (1) Client emits, (2) Gateway authenticates and routes, (3) Gateway resolves against Cache or Database. Every request passes through stage 2, and the Gateway is the only node with that property — the Cache is dashed and therefore bypassable, and the Database is unreachable except through the Gateway. It is the single point of failure.',
    reasoning:
      'Counted in-degree and out-degree per node. Client has out-degree 1 and in-degree 0; Database has in-degree 1; Cache has in-degree 1 on a dashed edge. Only the Gateway has both in- and out-degree ≥ 1 on solid edges, making it the sole articulation point of the graph.',
    confidence: 0.94,
    options: [
      'The API Gateway — every request traverses it and no solid path routes around it',
      'The Database — all state lives there so its loss is fatal',
      'The Cache — a cold cache would overwhelm the rest of the system',
      'The Client — without it no requests are generated at all',
    ],
    correctOptionIndex: 0,
    verdict: 'pass',
    correctness: 'correct',
    issues: [],
    score: 0.95,
  },
  {
    bloomLevel: 'Analyze',
    cognitiveSkill: 'Comparative edge analysis',
    text: 'Two edges leave the API Gateway. Compare them across direction, obligation and consequence of failure.',
    targets: ['API Gateway', 'Cache', 'Database'],
    answer:
      'Both are outbound and synchronous. They differ in obligation: the Database edge is solid and mandatory — it is the only route to durable state — while the Cache edge is dashed and discretionary. They differ in failure consequence too: losing the Cache edge degrades latency, losing the Database edge loses correctness, because no other node holds the system of record.',
    reasoning:
      'Held direction constant (both leave the Gateway) and varied stroke style and target semantics. The Cache is labelled "optional · ttl 60s" and the Database "primary store", so the asymmetry is stated in the diagram, not inferred.',
    confidence: 0.9,
    options: [
      'Same direction; the Database edge is mandatory and correctness-critical, the Cache edge optional and latency-critical',
      'The Cache edge is inbound and the Database edge outbound',
      'They are interchangeable — either can serve any request',
      'The Cache edge is mandatory and the Database edge is the optional fallback',
    ],
    correctOptionIndex: 0,
    verdict: 'pass',
    correctness: 'correct',
    issues: [],
    score: 0.91,
  },

  /* ---------------- Evaluate ---------------- */
  {
    bloomLevel: 'Evaluate',
    cognitiveSkill: 'Judgement against a design criterion',
    text: 'Judge whether attaching the Cache to the API Gateway rather than placing it in front of the Database is the better choice for this architecture. Argue from the diagram.',
    targets: ['Cache', 'API Gateway', 'Database'],
    answer:
      'Gateway-side is the better placement here. A hit terminates at stage 2 of a three-stage path, so it saves the Database round trip entirely — a database-side cache would still pay the Gateway→Database hop. The cost is coupling: cache invalidation now lives in the Gateway, which is already the single point of failure, so this placement trades resilience for latency. Given the diagram shows only one Gateway and one Database, the latency win is the defensible call.',
    reasoning:
      'Evaluated against two competing criteria — request latency and blast radius — and stated which one the diagram’s own topology privileges. The verdict is conditional on the single-gateway topology actually drawn.',
    confidence: 0.82,
    options: [
      'Better — a hit avoids the database hop entirely, at the cost of putting invalidation inside the single point of failure',
      'Worse — caches must always sit directly in front of the datastore they mirror',
      'Irrelevant — cache placement has no effect on latency in any architecture',
      'Better, because it removes the Gateway as a single point of failure',
    ],
    correctOptionIndex: 0,
    verdict: 'pass',
    correctness: 'correct',
    issues: [],
    score: 0.87,
  },
  {
    bloomLevel: 'Evaluate',
    cognitiveSkill: 'Assessment of representational completeness',
    text: 'Assess what this diagram does NOT represent. Name the most consequential omission and explain why its absence matters.',
    targets: ['Client', 'API Gateway', 'Database', 'Cache'],
    answer:
      'Every edge is one-way, so no response path is drawn — but the more consequential omission is failure and redundancy. There is no second Gateway, no replica, no timeout, no error path. The diagram documents the happy path only, which makes it useful for teaching flow and actively misleading as an operational reference.',
    reasoning:
      'Compared the drawn element set against what a deployable architecture requires. Response edges, retries, replicas and observability are all absent; of these, redundancy is the one whose absence changes the system’s real availability rather than merely its documentation.',
    confidence: 0.85,
    options: [
      'Failure handling and redundancy — no replicas, timeouts or error paths are drawn',
      'The colour scheme, which is not accessible to colour-blind readers',
      'The programming language each component is written in',
      'Nothing significant is missing; the diagram is complete',
    ],
    correctOptionIndex: 0,
    verdict: 'flagged',
    correctness: 'partial',
    issues: ['Multiple defensible answers exist (missing response edges, missing observability, missing redundancy).'],
    suggestion: 'Accept any omission the student can justify structurally, or narrow the prompt to "availability".',
    score: 0.74,
  },

  /* ---------------- Create ---------------- */
  {
    bloomLevel: 'Create',
    cognitiveSkill: 'Structural redesign under a constraint',
    text: 'Redesign this architecture so that the API Gateway is no longer a single point of failure. Specify the components you would add, where each edge goes, and what new problem your design introduces.',
    targets: ['API Gateway', 'Client', 'Database'],
    answer:
      'Put a load balancer in front of two or more stateless Gateway instances: Client → Load Balancer → {Gateway A, Gateway B} → Database, with each Gateway keeping its own dashed edge to a now-shared Cache. The new problem is that the load balancer inherits the single-point-of-failure role unless it is itself replicated across zones, and a shared cache introduces cross-instance invalidation that a single gateway never had.',
    reasoning:
      'Removing an articulation point requires adding a parallel path around it, which necessarily introduces a fan-out node upstream. Naming the displaced failure point rather than claiming the problem is solved is what distinguishes a Create-level answer from an Apply-level one.',
    confidence: 0.8,
    options: [
      'Load balancer in front of N stateless gateway replicas — but the balancer becomes the new SPOF and the shared cache needs invalidation',
      'Remove the gateway entirely and let clients query the database directly',
      'Add a second database so there are two of everything',
      'Increase the cache TTL so fewer requests reach the gateway',
    ],
    correctOptionIndex: 0,
    verdict: 'pass',
    correctness: 'correct',
    issues: [],
    score: 0.86,
  },
  {
    bloomLevel: 'Create',
    cognitiveSkill: 'Extension without violating a constraint',
    text: 'Design an extension that adds slow background processing (e.g. report generation) to this system without changing the Client or increasing its request latency. Draw the new edges in words.',
    targets: ['API Gateway', 'Database'],
    answer:
      'Add a Queue and a Worker below the axis: Gateway → Queue (asynchronous, fire-and-forget) and Worker → Queue (consume), Worker → Database (write results). The Gateway returns as soon as the job is enqueued, so the Client’s synchronous path — and therefore its latency — is untouched, and the Client contract does not change at all because it still sends exactly one request to exactly one Gateway.',
    reasoning:
      'The constraint "no client change, no added latency" forbids inserting anything into the existing synchronous chain. The only structure that satisfies both is a branch off the Gateway that is not awaited, which is precisely an asynchronous queue.',
    confidence: 0.83,
    options: [
      'Gateway → Queue (async) with a Worker consuming from it and writing to the Database',
      'Make the Gateway run the report inline before responding to the Client',
      'Have the Client poll the Database directly for finished reports',
      'Store reports in the Cache and raise the TTL to 24 hours',
    ],
    correctOptionIndex: 0,
    verdict: 'pass',
    correctness: 'correct',
    issues: [],
    score: 0.84,
  },
]

/* ------------------------------------------------------------------ */
/* Script assembly                                                     */
/* ------------------------------------------------------------------ */

/**
 * Pick `count` bank items, leading with the ones matching the selected
 * Bloom level so the run visibly honours the wheel, then filling out
 * from the neighbouring levels. Deterministic: same inputs, same set.
 */
function pickItems(level: BloomLevel, count: number): BankItem[] {
  const preferred = BANK.filter((b) => b.bloomLevel === level)
  const rest = BANK.filter((b) => b.bloomLevel !== level)
  const ordered = [...preferred, ...rest]
  const out: BankItem[] = []
  for (let i = 0; i < count; i++) out.push(ordered[i % ordered.length])
  return out
}

export interface DemoScript {
  extraction: ExtractionOutput
  questions: GeneratedQuestion[]
  answers: GeneratedAnswer[]
  verification: VerificationVerdict[]
  finalQA: FinalQAItem[]
}

export function buildDemoScript(
  bloomLevel: BloomLevel,
  questionCount: number,
  mcqOnly: boolean,
): DemoScript {
  const count = Math.max(1, Math.min(20, Math.round(questionCount) || 4))
  const items = pickItems(bloomLevel, count)

  const questions: GeneratedQuestion[] = items.map((it, i) => ({
    id: `demo-q${i + 1}`,
    text: it.text,
    bloomLevel: it.bloomLevel,
    cognitiveSkill: it.cognitiveSkill,
    targets: it.targets,
    questionType: mcqOnly ? 'mcq' : 'short-answer',
    ...(mcqOnly ? { options: it.options, correctOptionIndex: it.correctOptionIndex } : {}),
  }))

  const answers: GeneratedAnswer[] = items.map((it, i) => ({
    questionId: `demo-q${i + 1}`,
    answer: mcqOnly ? it.options[it.correctOptionIndex] : it.answer,
    reasoning: it.reasoning,
    confidence: it.confidence,
    ...(mcqOnly ? { selectedOptionIndex: it.correctOptionIndex } : {}),
  }))

  const verification: VerificationVerdict[] = items.map((it, i) => ({
    questionId: `demo-q${i + 1}`,
    status: it.verdict,
    correctness: it.correctness,
    ambiguity: it.verdict === 'flagged',
    difficultyAccurate: true,
    leakRisk: false,
    issues: it.issues,
    suggestion: it.suggestion,
  }))

  const finalQA: FinalQAItem[] = items.map((it, i) => ({
    id: `demo-q${i + 1}`,
    question: it.text,
    answer: it.answer,
    bloomLevel: it.bloomLevel,
    cognitiveSkill: it.cognitiveSkill,
    verification: it.verdict === 'reject' ? 'flagged' : (it.verdict as 'pass' | 'flagged'),
    score: it.score,
    questionType: mcqOnly ? 'mcq' : 'short-answer',
    ...(mcqOnly ? { options: it.options, correctOptionIndex: it.correctOptionIndex } : {}),
  }))

  return { extraction: DEMO_EXTRACTION, questions, answers, verification, finalQA }
}

/* ------------------------------------------------------------------ */
/* The replay engine                                                   */
/* ------------------------------------------------------------------ */

export interface RunDemoOptions {
  runId: string
  bloomLevel: BloomLevel
  questionCount: number
  mcqOnly: boolean
  onStage: (ev: StageEvent) => void
  onLog: (line: Omit<LogLine, 'id' | 'timestamp'>) => void
}

/**
 * Cancellation lives at module scope, NOT in the calling component.
 *
 * The very first thing a run does is switch `activeStage` away from
 * 'upload', which unmounts UploadStage — so a token owned by that
 * component would be torn down one beat into its own replay. The replay
 * outlives whichever component kicked it off, and is only stopped by an
 * explicit reset or by a newer run superseding it.
 */
let activeToken: { cancelled: boolean } | null = null

/** Abort any scripted run currently replaying. */
export function cancelDemoRun(): void {
  if (activeToken) activeToken.cancelled = true
  activeToken = null
}

const DEMO_PROVIDER = 'demo'
const DEMO_MODEL = 'scripted-run/offline'

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/**
 * Replays the scripted run. Beats are short enough that the whole thing
 * finishes in about eight seconds — long enough to watch the agents work,
 * short enough that nobody sits waiting on a demo.
 */
export async function runDemoPipeline(opts: RunDemoOptions): Promise<void> {
  const { runId, bloomLevel, questionCount, mcqOnly, onStage, onLog } = opts
  const script = buildDemoScript(bloomLevel, questionCount, mcqOnly)

  // Supersede any replay still in flight, then claim the slot.
  cancelDemoRun()
  const token = { cancelled: false }
  activeToken = token
  const cancelled = () => token.cancelled

  const stage = (
    s: StageEvent['stage'],
    status: StageEvent['status'],
    message?: string,
    data?: StageEvent['data'],
  ) => onStage({ runId, stage: s, status, message, data, provider: DEMO_PROVIDER, model: DEMO_MODEL, timestamp: Date.now() })

  const log = (s: LogLine['stage'], level: LogLine['level'], text: string) =>
    onLog({ runId, stage: s, level, text })

  const beat = async (ms: number) => {
    await sleep(ms)
    return !cancelled()
  }

  /* ---- upload ---- */
  stage('upload', 'done', 'Sample diagram ingested')
  log('upload', 'success', 'Scripted demo run — no provider call will be made.')
  if (!(await beat(320))) return

  /* ---- extraction ---- */
  stage('extraction', 'running', 'Vision agent reading the diagram…')
  log('extraction', 'info', 'Rasterising sample-architecture.svg → 1360×680 PNG')
  if (!(await beat(700))) return
  log('extraction', 'info', 'Detected 4 node candidates, 3 edge candidates')
  if (!(await beat(650))) return
  log('extraction', 'info', 'Resolving edge direction from arrowhead geometry')
  if (!(await beat(600))) return
  stage('extraction', 'done', '4 entities · 3 relationships', script.extraction)
  log('extraction', 'success', 'Structure locked: layered request-path architecture')
  if (!(await beat(420))) return

  /* ---- generation ---- */
  stage('generation', 'running', `Generating ${script.questions.length} ${bloomLevel}-conditioned questions…`)
  log('generation', 'info', `Bloom target: ${bloomLevel} · mode: ${mcqOnly ? 'MCQ (4 options)' : 'short answer'}`)
  if (!(await beat(700))) return
  for (let i = 0; i < Math.min(script.questions.length, 4); i++) {
    log('generation', 'info', `Drafted Q${i + 1} — ${script.questions[i].cognitiveSkill}`)
    if (!(await beat(240))) return
  }
  stage('generation', 'done', `${script.questions.length} questions drafted`, script.questions)
  log('generation', 'success', `${script.questions.length} questions grounded in extracted entities`)
  if (!(await beat(380))) return

  /* ---- answering ---- */
  stage('answering', 'running', 'Solver agent answering from the diagram only…')
  log('answering', 'info', 'Solver runs blind to the generator’s intended answers')
  if (!(await beat(760))) return
  const meanConf =
    script.answers.reduce((a, b) => a + b.confidence, 0) / (script.answers.length || 1)
  stage('answering', 'done', `${script.answers.length} answers · mean confidence ${(meanConf * 100).toFixed(0)}%`, script.answers)
  log('answering', 'success', `Answered ${script.answers.length}/${script.questions.length}`)
  if (!(await beat(400))) return

  /* ---- verification ---- */
  stage('verification', 'running', 'Critic agent cross-checking Q&A pairs…')
  log('verification', 'info', 'Checking correctness, ambiguity, difficulty fit and answer leakage')
  if (!(await beat(820))) return
  const flagged = script.verification.filter((v) => v.status === 'flagged').length
  if (flagged > 0) {
    log('verification', 'warn', `${flagged} item(s) flagged for ambiguity — kept with a note`)
    if (!(await beat(300))) return
  }
  stage(
    'verification',
    flagged > 0 ? 'flagged' : 'done',
    `${script.verification.length - flagged} passed · ${flagged} flagged`,
    script.verification,
  )
  if (!(await beat(420))) return

  /* ---- results ---- */
  stage('results', 'running', 'Curating the verified set…')
  if (!(await beat(520))) return
  stage('results', 'done', `${script.finalQA.length} questions ready`, script.finalQA)
  log('results', 'success', 'Demo run complete — open the chat to ask follow-ups.')
}

/* ------------------------------------------------------------------ */
/* Offline chatbot                                                     */
/* ------------------------------------------------------------------ */

interface DemoReply {
  match: RegExp
  reply: string
}

const DEMO_REPLIES: DemoReply[] = [
  {
    match: /single point|spof|fail|failure|down|outage|resilien|redundan/i,
    reply:
      '**The API Gateway is the single point of failure.**\n\nTrace the graph: the Client has exactly one outgoing edge, and it lands on the Gateway. The Database has exactly one incoming edge, and it originates at the Gateway. The Cache sits on a dashed — bypassable — edge. That makes the Gateway the only *articulation point*: remove it and the graph splits into disconnected pieces.\n\nTo remove it as a SPOF you would put a load balancer in front of two or more stateless Gateway replicas. Note that this displaces the problem rather than deleting it — the balancer becomes the new single point unless it is itself replicated.',
  },
  {
    match: /cache|ttl|dashed|optional/i,
    reply:
      'The **Cache** is drawn dashed, with the sub-label `optional · ttl 60s`.\n\n- **Placement:** it hangs off the *API Gateway*, not off the Database. A hit therefore terminates the request one hop earlier and skips the database round trip entirely.\n- **Optionality:** because the solid path `Client → Gateway → Database` is complete on its own, the dashed branch cannot be load-bearing. The system is correct without it; it is only slower.\n- **The trade-off:** invalidation logic now lives inside the Gateway, which is already the busiest and most failure-critical node.',
  },
  {
    match: /path|flow|trace|request|route|order|step/i,
    reply:
      'The request path has three stages:\n\n1. **Client → API Gateway** — edge labelled `request`. This is the only way in.\n2. **API Gateway** — authenticates and routes (`auth · routing`), then decides whether the Cache can serve the read.\n3. **Gateway → Cache** (dashed `lookup`) *or* **Gateway → Database** (solid `query`).\n\nOne detail worth noticing: **every edge is one-way**. The diagram documents request flow only — no response path is drawn at all.',
  },
  {
    match: /entit|component|node|box|list|what.*shown|how many/i,
    reply:
      'Four entities and three relationships were extracted:\n\n| Entity | Type | Role |\n| --- | --- | --- |\n| Client | actor | Originates every request |\n| API Gateway | service | Authenticates, routes, fans out |\n| Cache | store | Optional read-through, 60s TTL |\n| Database | store | Primary system of record |\n\n**Edges:** `Client → Gateway` (request, synchronous), `Gateway → Database` (query, synchronous), `Gateway → Cache` (lookup, optional).',
  },
  {
    match: /bloom|difficult|level|taxonom|why.*question/i,
    reply:
      'Questions are conditioned on the Bloom level you picked on the wheel, and each one names the cognitive skill it targets.\n\n- **Remember / Understand** questions ask you to read the diagram — labels, directions, notation.\n- **Apply / Analyze** questions make you *use* the structure: trace a concrete request, count in-degree and out-degree, compare two edges.\n- **Evaluate / Create** questions require a judgement or a new structure — and a good answer at those levels has to name the cost of its own proposal, not just the benefit.\n\nThat escalation is why the same diagram can carry a whole assessment rather than a single quiz.',
  },
  {
    match: /database|storage|persist|data store|record/i,
    reply:
      'The **Database** is labelled `primary store` — the system of record.\n\nIt has **in-degree 1 and out-degree 0** in this diagram: reachable only through the API Gateway, and it initiates nothing itself. That matters for two reasons. First, the Gateway is the sole place where access policy can be enforced. Second, losing the Database edge is a *correctness* failure, whereas losing the Cache edge is only a *latency* failure — no other node holds durable state.',
  },
  {
    match: /missing|not shown|omit|complete|improve|weakness|critique/i,
    reply:
      'Three things are absent, in rising order of consequence:\n\n1. **Response edges.** Every arrow is one-way, so the diagram shows request flow and not the round trip.\n2. **Observability.** No logging, metrics or tracing appears anywhere.\n3. **Failure handling and redundancy.** No replicas, no timeouts, no error paths — this is a happy-path drawing.\n\nThe third is the consequential one: it makes the diagram excellent for *teaching flow* and actively misleading as an *operational reference*.',
  },
  {
    match: /demo|api key|offline|real|scripted|fake/i,
    reply:
      'You are in **scripted demo mode**. This run never touched a model — the extraction, questions, answers, verification verdicts and this conversation are all replayed locally, so the sample diagram works with no API key and no account.\n\nTo run the pipeline against **your own** diagram with a real model, add a vision-capable key under *Settings → API Keys*, then upload a file instead of loading the sample.',
  },
]

const DEMO_FALLBACK =
  'That is outside what this sample diagram covers — the scripted demo only knows the four entities it extracted.\n\nBased on the structure that *was* extracted, you could ask me about:\n\n- why the **API Gateway** is the single point of failure\n- what the **dashed Cache edge** is communicating\n- the exact **request path** and what happens on a cache hit\n- what the diagram **fails to represent**\n- how the **Bloom level** changed the questions you got\n\nFor open-ended questions about your own diagrams, add an API key in *Settings → API Keys* and run a real pipeline.'

/** Deterministic offline reply for the follow-up chatbot. */
export function demoChatReply(message: string): string {
  const hit = DEMO_REPLIES.find((r) => r.match.test(message))
  return hit ? hit.reply : DEMO_FALLBACK
}
