/**
 * AR2-DDCQG multi-agent pipeline.
 *
 *   Extraction  (VLM)   — diagram → structured representation
 *   Generation  (LLM)   — structure + Bloom level → questions
 *   Answering   (LLM)   — questions + structure → independent answers
 *   Verification(LLM)   — Q&A pairs → verdicts (correctness/ambiguity/leak/difficulty)
 *   Curation            — verdicts → curated, scored final Q&A set
 *
 * All four model-backed agents use z-ai-web-dev-sdk on the backend.
 * The Answering agent is deliberately given ONLY the diagram structure
 * (never the generator's intended answers) so the pipeline can detect
 * answer-leakage in the questions.
 */

import ZAI from 'z-ai-web-dev-sdk'
import { extractJson } from './json.js'
import type {
  BloomLevel,
  ExtractionOutput,
  GeneratedQuestion,
  GeneratedAnswer,
  VerificationVerdict,
  FinalQAItem,
} from '../../src/lib/types.js'
import { BLOOM_META } from '../../src/lib/bloom.js'

let zaiPromise: Promise<ZAI> | null = null
async function getZAI(): Promise<ZAI> {
  if (!zaiPromise) zaiPromise = ZAI.create()
  return zaiPromise
}

/** Small helper to log + surface progress without blocking the pipeline. */
export type Emit = (
  level: 'info' | 'warn' | 'error' | 'success',
  text: string
) => void

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/* ------------------------------------------------------------------ */
/* 1. Extraction Agent (Vision)                                        */
/* ------------------------------------------------------------------ */

export async function runExtraction(
  dataUrl: string,
  emit: Emit
): Promise<ExtractionOutput> {
  emit('info', 'Vision agent reading diagram…')
  const zai = await getZAI()

  const isPdf = dataUrl.startsWith('data:application/pdf')
  const media = isPdf
    ? { type: 'file_url' as const, file_url: { url: dataUrl } }
    : { type: 'image_url' as const, image_url: { url: dataUrl } }

  const prompt = `You are the Extraction Agent in a multi-agent diagram-question-generation pipeline.
Analyse the attached diagram and extract its structure into JSON.

Return ONLY valid JSON (no markdown fences, no prose) with this EXACT shape:
{
  "diagramType": "<one of: architecture | flowchart | circuit | state-machine | process | class-diagram | network | other — pick the best fit>",
  "summary": "<one or two sentence plain-English summary of what the diagram represents>",
  "entities": [
    { "id": "e1", "label": "<human-readable label as shown>", "type": "<component|process|decision|datastore|module|node|device|actor|state|class|layer>", "role": "<optional short role, e.g. 'entry point', 'database', 'decision gate'>" }
  ],
  "relationships": [
    { "from": "e1", "to": "e2", "label": "<edge label or relationship verb>", "kind": "<flow|control|data|depends-on|contains|calls|inheritance>" }
  ],
  "layoutNotes": "<optional: brief note on spatial layout, e.g. 'left-to-right pipeline', 'hub-and-spoke'>"
}

Rules:
- Extract between 4 and 14 entities (merge trivial duplicates).
- Entity ids MUST be e1, e2, e3 … in reading order.
- Every relationship.from / relationship.to MUST reference an existing entity id.
- Labels should match what is literally written in the diagram where possible.
- If the diagram is a flowchart, capture decision branches as relationships labelled yes/no or condition names.
- Keep summary factual; do not speculate beyond what is visible.`

  const response = await zai.chat.completions.createVision({
    model: 'glm-4.6v',
    messages: [
      { role: 'assistant', content: [{ type: 'text', text: 'Output only raw JSON.' }] },
      { role: 'user', content: [{ type: 'text', text: prompt }, media] },
    ],
    thinking: { type: 'disabled' },
  })

  const raw = response.choices?.[0]?.message?.content ?? ''
  const parsed = extractJson<ExtractionOutput>(raw)

  // Normalise + guard
  const entities = (parsed.entities ?? []).slice(0, 18).map((e, i) => ({
    id: e.id || `e${i + 1}`,
    label: String(e.label || 'unnamed'),
    type: String(e.type || 'node'),
    role: e.role ? String(e.role) : undefined,
  }))
  const validIds = new Set(entities.map((e) => e.id))
  const relationships = (parsed.relationships ?? [])
    .filter((r) => validIds.has(r.from) && validIds.has(r.to))
    .slice(0, 30)
    .map((r) => ({
      from: r.from,
      to: r.to,
      label: String(r.label || 'relates to'),
      kind: r.kind ? String(r.kind) : 'flow',
    }))

  const out: ExtractionOutput = {
    diagramType: String(parsed.diagramType || 'diagram'),
    summary: String(parsed.summary || 'Extracted diagram structure.'),
    entities,
    relationships,
    layoutNotes: parsed.layoutNotes ? String(parsed.layoutNotes) : undefined,
  }

  emit(
    'success',
    `Extracted ${entities.length} entities, ${relationships.length} relationships — ${out.diagramType}`
  )
  return out
}

/* ------------------------------------------------------------------ */
/* 2. Question Generation Agent (Bloom's-conditioned)                 */
/* ------------------------------------------------------------------ */

export async function runGeneration(
  extraction: ExtractionOutput,
  bloom: BloomLevel,
  emit: Emit
): Promise<GeneratedQuestion[]> {
  const meta = BLOOM_META[bloom]
  emit('info', `Generator agent composing questions at ${bloom} level (${meta.verb})…`)
  const zai = await getZAI()

  const structure = JSON.stringify(
    {
      diagramType: extraction.diagramType,
      summary: extraction.summary,
      entities: extraction.entities,
      relationships: extraction.relationships,
    },
    null,
    2
  )

  const prompt = `You are the Question Generation Agent in a multi-agent pipeline.
A vision agent has extracted the following structured representation of a diagram:

${structure}

Target cognitive level (Bloom's taxonomy): ${bloom}
Cognitive verb for this level: "${meta.verb}"
Definition: ${meta.blurb}

Generate exactly 4 questions that require a learner to operate at the ${bloom} level using ONLY information derivable from the diagram structure above.

Rules:
- Each question MUST be answerable from the diagram structure alone.
- Do NOT state or hint at the answer inside the question (no answer leakage).
- Match the cognitive demand to "${bloom}": ${meta.blurb}
- "targets" lists the entity ids the question is about (from the structure).
- Vary which parts of the diagram each question targets.

Return ONLY a valid JSON array (no markdown, no prose), each item exactly:
{ "id": "q1", "text": "<question>", "bloomLevel": "${bloom}", "cognitiveSkill": "<recall|explain|apply|analyse|evaluate|design>", "targets": ["e1"] }

Use ids q1, q2, q3, q4.`

  const response = await zai.chat.completions.create({
    messages: [
      { role: 'assistant', content: 'Output only a raw JSON array.' },
      { role: 'user', content: prompt },
    ],
    thinking: { type: 'disabled' },
  })

  const raw = response.choices?.[0]?.message?.content ?? ''
  const parsed = extractJson<GeneratedQuestion[]>(raw)

  const valid = new Set(extraction.entities.map((e) => e.id))
  const questions = (Array.isArray(parsed) ? parsed : [])
    .slice(0, 6)
    .map((q, i) => ({
      id: q.id || `q${i + 1}`,
      text: String(q.text || 'Untitled question'),
      bloomLevel: bloom,
      cognitiveSkill: String(q.cognitiveSkill || meta.verb),
      targets: Array.isArray(q.targets)
        ? q.targets.filter((t) => valid.has(t))
        : [],
    }))

  if (questions.length === 0) throw new Error('Generator produced no questions')
  emit('success', `Generated ${questions.length} questions at ${bloom} level`)
  return questions
}

/* ------------------------------------------------------------------ */
/* 3. Answering Agent (independent — no access to intended answers)   */
/* ------------------------------------------------------------------ */

export async function runAnswering(
  extraction: ExtractionOutput,
  questions: GeneratedQuestion[],
  emit: Emit
): Promise<GeneratedAnswer[]> {
  emit('info', 'Solver agent answering each question independently from the diagram…')
  const zai = await getZAI()

  const structure = JSON.stringify(
    {
      diagramType: extraction.diagramType,
      summary: extraction.summary,
      entities: extraction.entities,
      relationships: extraction.relationships,
    },
    null,
    2
  )
  const qs = JSON.stringify(
    questions.map((q) => ({ id: q.id, text: q.text })),
    null,
    2
  )

  const prompt = `You are the Answering Agent. You answer questions using ONLY the diagram structure below. You do NOT see any other agent's answer — answer independently and ground every answer in the diagram.

Diagram structure:
${structure}

Questions:
${qs}

For each question, provide a concise, correct answer and brief reasoning that cites the relevant entities/relationships. Assign a confidence score (0.0–1.0) reflecting how directly the diagram supports your answer.

Return ONLY a valid JSON array (no markdown), each item exactly:
{ "questionId": "q1", "answer": "<answer>", "reasoning": "<1-2 sentences grounded in the diagram>", "confidence": 0.85 }

Answer every question. questionId must match the input ids.`

  const response = await zai.chat.completions.create({
    messages: [
      { role: 'assistant', content: 'Output only a raw JSON array.' },
      { role: 'user', content: prompt },
    ],
    thinking: { type: 'disabled' },
  })

  const raw = response.choices?.[0]?.message?.content ?? ''
  const parsed = extractJson<GeneratedAnswer[]>(raw)

  const answers: GeneratedAnswer[] = (Array.isArray(parsed) ? parsed : []).map(
    (a) => ({
      questionId: String(a.questionId || ''),
      answer: String(a.answer || ''),
      reasoning: String(a.reasoning || ''),
      confidence: typeof a.confidence === 'number' ? a.confidence : 0.5,
    })
  )

  // Backfill any missing answers
  for (const q of questions) {
    if (!answers.find((a) => a.questionId === q.id)) {
      answers.push({
        questionId: q.id,
        answer: 'Unable to determine from the diagram.',
        reasoning: 'No supporting structure found.',
        confidence: 0.2,
      })
    }
  }

  emit('success', `Answered ${answers.length} questions independently`)
  return answers
}

/* ------------------------------------------------------------------ */
/* 4. Verification Agent (Critic)                                      */
/* ------------------------------------------------------------------ */

export async function runVerification(
  extraction: ExtractionOutput,
  questions: GeneratedQuestion[],
  answers: GeneratedAnswer[],
  emit: Emit
): Promise<VerificationVerdict[]> {
  emit('info', 'Critic agent verifying Q&A pairs for correctness, ambiguity, leakage…')
  const zai = await getZAI()

  const pairs = questions.map((q) => {
    const a = answers.find((x) => x.questionId === q.id)
    return {
      questionId: q.id,
      question: q.text,
      statedBloomLevel: q.bloomLevel,
      cognitiveSkill: q.cognitiveSkill,
      answer: a?.answer ?? '',
      reasoning: a?.reasoning ?? '',
      confidence: a?.confidence ?? 0,
    }
  })

  const prompt = `You are the Verification / Critic Agent. For each Q&A pair below, check it against the extracted diagram structure.

Diagram structure:
${JSON.stringify(
  {
    diagramType: extraction.diagramType,
    summary: extraction.summary,
    entities: extraction.entities,
    relationships: extraction.relationships,
  },
  null,
  2
)}

Q&A pairs:
${JSON.stringify(pairs, null, 2)}

For each pair, evaluate:
1. correctness — is the answer correct given the diagram? (correct | partial | incorrect)
2. ambiguity — is the question ambiguous or unanswerable from the diagram? (boolean)
3. difficultyAccurate — does the question genuinely demand the stated Bloom level "${'<level>'}"? (boolean)
4. leakRisk — does the question leak its own answer? (boolean)
5. issues — short list of any problems (empty array if none)
6. suggestion — optional one-line improvement
7. status — overall verdict: "pass" (all good), "flagged" (minor issues but usable), "reject" (incorrect or seriously ambiguous/leaky)

Return ONLY a valid JSON array (no markdown), one entry per question, each exactly:
{ "questionId": "q1", "status": "pass", "correctness": "correct", "ambiguity": false, "difficultyAccurate": true, "leakRisk": false, "issues": [], "suggestion": "optional" }`

  const response = await zai.chat.completions.create({
    messages: [
      { role: 'assistant', content: 'Output only a raw JSON array.' },
      { role: 'user', content: prompt },
    ],
    thinking: { type: 'disabled' },
  })

  const raw = response.choices?.[0]?.message?.content ?? ''
  const parsed = extractJson<VerificationVerdict[]>(raw)

  const verdicts: VerificationVerdict[] = (Array.isArray(parsed) ? parsed : []).map(
    (v) => ({
      questionId: String(v.questionId || ''),
      status: (['pass', 'flagged', 'reject'].includes(v.status)
        ? v.status
        : 'flagged') as VerificationVerdict['status'],
      correctness: (['correct', 'partial', 'incorrect'].includes(v.correctness)
        ? v.correctness
        : 'partial') as VerificationVerdict['correctness'],
      ambiguity: Boolean(v.ambiguity),
      difficultyAccurate: v.difficultyAccurate !== false,
      leakRisk: Boolean(v.leakRisk),
      issues: Array.isArray(v.issues) ? v.issues.map(String) : [],
      suggestion: v.suggestion ? String(v.suggestion) : undefined,
    })
  )

  // Backfill
  for (const q of questions) {
    if (!verdicts.find((v) => v.questionId === q.id)) {
      verdicts.push({
        questionId: q.id,
        status: 'flagged',
        correctness: 'partial',
        ambiguity: false,
        difficultyAccurate: true,
        leakRisk: false,
        issues: ['Verifier did not return a verdict for this question.'],
      })
    }
  }

  const passN = verdicts.filter((v) => v.status === 'pass').length
  const flagN = verdicts.filter((v) => v.status === 'flagged').length
  const rejN = verdicts.filter((v) => v.status === 'reject').length
  emit(
    'success',
    `Verification complete — ${passN} passed, ${flagN} flagged, ${rejN} rejected`
  )
  return verdicts
}

/* ------------------------------------------------------------------ */
/* 5. Curation — assemble the final, scored Q&A set                    */
/* ------------------------------------------------------------------ */

export function curateFinalQA(
  questions: GeneratedQuestion[],
  answers: GeneratedAnswer[],
  verdicts: VerificationVerdict[]
): FinalQAItem[] {
  const items: FinalQAItem[] = []

  for (const q of questions) {
    const v = verdicts.find((x) => x.questionId === q.id)
    const a = answers.find((x) => x.questionId === q.id)
    if (!v || !a) continue
    if (v.status === 'reject') continue

    const verdict: 'pass' | 'flagged' = v.status === 'pass' ? 'pass' : 'flagged'
    const correctnessWeight =
      v.correctness === 'correct' ? 1 : v.correctness === 'partial' ? 0.6 : 0.3
    const leakPenalty = v.leakRisk ? 0.3 : 0
    const ambigPenalty = v.ambiguity ? 0.2 : 0
    const diffPenalty = v.difficultyAccurate ? 0 : 0.1
    const confidence = typeof a.confidence === 'number' ? a.confidence : 0.5
    const score = Math.max(
      0,
      Math.min(1, confidence * correctnessWeight - leakPenalty - ambigPenalty - diffPenalty)
    )

    items.push({
      id: q.id,
      question: q.text,
      answer: a.answer,
      bloomLevel: q.bloomLevel,
      cognitiveSkill: q.cognitiveSkill,
      verification: verdict,
      score: Math.round(score * 100) / 100,
    })
  }

  // Sort: passed first, then by score descending
  items.sort((a, b) => {
    if (a.verification !== b.verification) return a.verification === 'pass' ? -1 : 1
    return b.score - a.score
  })

  return items
}
