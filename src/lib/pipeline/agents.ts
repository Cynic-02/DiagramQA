/**
 * AR2-DDCQG multi-agent pipeline.
 *
 *   Extraction  (VLM)   — diagram → structured representation
 *   Generation  (LLM)   — structure + Bloom level → questions
 *   Answering   (LLM)   — questions + structure → independent answers
 *   Verification(LLM)   — Q&A pairs → verdicts (correctness/ambiguity/leak/difficulty)
 *   Curation            — verdicts → curated, scored final Q&A set
 *
 * All four model-backed agents go through the provider abstraction in
 * ../ai/providers (chat()), which supports multiple providers (Gemini,
 * GLM, DeepSeek, Groq, Kimi, etc.) with per-provider API-key rotation and
 * cross-provider fallback. This replaces a previous direct dependency on
 * z-ai-web-dev-sdk, which only works inside Z.ai's own sandbox (it reads
 * a local .z-ai-config file that does not exist in a normal deployment
 * such as Vercel) and caused every agent call to fail in production.
 *
 * The Answering agent is deliberately given ONLY the diagram structure
 * (never the generator's intended answers) so the pipeline can detect
 * answer-leakage in the questions.
 *
 * NOTE: ported from mini-services/pipeline-service/agents.ts so it can be
 * invoked directly from a Next.js API route (Vercel-compatible) instead of
 * a standalone Socket.io process. Logic is unchanged from the original
 * aside from the model-calling layer.
 */

import { chat } from '../ai/providers'
import { extractJson } from './json'
import type {
  BloomLevel,
  ExtractionOutput,
  GeneratedQuestion,
  GeneratedAnswer,
  VerificationVerdict,
  FinalQAItem,
} from '../types'
import { BLOOM_META } from '../bloom'

/** Small helper to log + surface progress without blocking the pipeline. */
export type Emit = (
  level: 'info' | 'warn' | 'error' | 'success',
  text: string
) => void

/* ------------------------------------------------------------------ */
/* 1. Extraction Agent (Vision)                                        */
/* ------------------------------------------------------------------ */

export async function runExtraction(
  dataUrl: string,
  emit: Emit,
  providerId?: string,
  userId?: string
): Promise<ExtractionOutput> {
  emit('info', 'Vision agent reading diagram…')

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

  const result = await chat(
    [
      { role: 'system', content: 'Output only raw JSON.' },
      { role: 'user', content: prompt, image: dataUrl },
    ],
    { reasoning: true, provider: providerId, userId }
  )

  emit('info', `[provider] ${result.provider} (${result.model})`)
  for (const step of result.reasoning) emit('info', step)
  const raw = result.content
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
  emit: Emit,
  providerId?: string,
  userId?: string,
  questionCount = 4,
  mcqOnly = false
): Promise<GeneratedQuestion[]> {
  const meta = BLOOM_META[bloom]
  const count = Math.max(1, Math.min(20, Math.round(questionCount)))
  emit(
    'info',
    `Generator agent composing ${count} ${mcqOnly ? 'MCQ ' : ''}question${count === 1 ? '' : 's'} at ${bloom} level (${meta.verb})…`
  )

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

  const idExamples = Array.from({ length: Math.min(count, 4) }, (_, i) => `q${i + 1}`).join(', ')

  const mcqInstructions = mcqOnly
    ? `
Every question MUST be a multiple-choice question with EXACTLY 4 options.
- "options" is an array of exactly 4 plausible answer strings, in a sensible order.
- "correctOptionIndex" is the 0-based index into "options" of the single correct choice.
- Distractors (the 3 incorrect options) must be plausible given the diagram — not
  obviously wrong — but must not each be independently defensible as also correct.
- Do not reveal which option is correct anywhere in the question text itself.`
    : ''

  const jsonShape = mcqOnly
    ? `{ "id": "q1", "text": "<question>", "bloomLevel": "${bloom}", "cognitiveSkill": "<recall|explain|apply|analyse|evaluate|design>", "targets": ["e1"], "options": ["<option A>", "<option B>", "<option C>", "<option D>"], "correctOptionIndex": 0 }`
    : `{ "id": "q1", "text": "<question>", "bloomLevel": "${bloom}", "cognitiveSkill": "<recall|explain|apply|analyse|evaluate|design>", "targets": ["e1"] }`

  const prompt = `You are the Question Generation Agent in a multi-agent pipeline.
A vision agent has extracted the following structured representation of a diagram:

${structure}

Target cognitive level (Bloom's taxonomy): ${bloom}
Cognitive verb for this level: "${meta.verb}"
Definition: ${meta.blurb}

Generate exactly ${count} question${count === 1 ? '' : 's'} that require a learner to operate at the ${bloom} level using ONLY information derivable from the diagram structure above.
${mcqInstructions}

Rules:
- Each question MUST be answerable from the diagram structure alone.
- Do NOT state or hint at the answer inside the question (no answer leakage).
- Match the cognitive demand to "${bloom}": ${meta.blurb}
- "targets" lists the entity ids the question is about (from the structure).
- Vary which parts of the diagram each question targets.

Return ONLY a valid JSON array (no markdown, no prose), each item exactly:
${jsonShape}

Use ids ${idExamples}${count > 4 ? ', … up to q' + count : ''}.`

  const response = await chat(
    [
      { role: 'system', content: 'Output only a raw JSON array.' },
      { role: 'user', content: prompt },
    ],
    { reasoning: true, provider: providerId, userId }
  )

  emit('info', `[provider] ${response.provider} (${response.model})`)
  for (const step of response.reasoning) emit('info', step)
  const raw = response.content
  const parsed = extractJson<GeneratedQuestion[]>(raw)

  const valid = new Set(extraction.entities.map((e) => e.id))
  const questions = (Array.isArray(parsed) ? parsed : [])
    .slice(0, count)
    .map((q, i) => {
      const base = {
        id: q.id || `q${i + 1}`,
        text: String(q.text || 'Untitled question'),
        bloomLevel: bloom,
        cognitiveSkill: String(q.cognitiveSkill || meta.verb),
        targets: Array.isArray(q.targets)
          ? q.targets.filter((t) => valid.has(t))
          : [],
      }
      if (!mcqOnly) return base
      // MCQ mode: normalise options to exactly 4 entries and clamp the
      // correct index into range; fall back to a generic 4-option shape
      // if the model returned something malformed rather than dropping
      // the question outright.
      const rawOptions = Array.isArray(q.options) ? q.options.map(String) : []
      const options =
        rawOptions.length >= 4
          ? rawOptions.slice(0, 4)
          : [...rawOptions, ...Array(4 - rawOptions.length).fill('(no option provided)')]
      const correctOptionIndex =
        typeof q.correctOptionIndex === 'number' &&
        q.correctOptionIndex >= 0 &&
        q.correctOptionIndex < 4
          ? q.correctOptionIndex
          : 0
      return {
        ...base,
        questionType: 'mcq' as const,
        options,
        correctOptionIndex,
      }
    })

  if (questions.length === 0) throw new Error('Generator produced no questions')
  emit('success', `Generated ${questions.length} question${questions.length === 1 ? '' : 's'} at ${bloom} level`)
  return questions
}

/* ------------------------------------------------------------------ */
/* 3. Answering Agent (independent — no access to intended answers)   */
/* ------------------------------------------------------------------ */

export async function runAnswering(
  extraction: ExtractionOutput,
  questions: GeneratedQuestion[],
  emit: Emit,
  providerId?: string,
  userId?: string
): Promise<GeneratedAnswer[]> {
  emit('info', 'Solver agent answering each question independently from the diagram…')

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
    questions.map((q) =>
      q.questionType === 'mcq'
        ? { id: q.id, text: q.text, options: q.options }
        : { id: q.id, text: q.text }
    ),
    null,
    2
  )

  const hasMcq = questions.some((q) => q.questionType === 'mcq')
  const mcqInstructions = hasMcq
    ? `
For any question that includes an "options" array, this is a multiple-choice
question: pick exactly one option and report it as "selectedOptionIndex"
(0-based index into that question's own options array), and put that same
option's text as your "answer".`
    : ''

  const prompt = `You are the Answering Agent. You answer questions using ONLY the diagram structure below. You do NOT see any other agent's answer — answer independently and ground every answer in the diagram.

Diagram structure:
${structure}

Questions:
${qs}
${mcqInstructions}

For each question, provide a concise, correct answer and brief reasoning that cites the relevant entities/relationships. Assign a confidence score (0.0–1.0) reflecting how directly the diagram supports your answer.

Return ONLY a valid JSON array (no markdown), each item exactly:
{ "questionId": "q1", "answer": "<answer>", "reasoning": "<1-2 sentences grounded in the diagram>", "confidence": 0.85${hasMcq ? ', "selectedOptionIndex": 0' : ''} }

Answer every question. questionId must match the input ids.`

  const response = await chat(
    [
      { role: 'system', content: 'Output only a raw JSON array.' },
      { role: 'user', content: prompt },
    ],
    { reasoning: true, provider: providerId, userId }
  )

  emit('info', `[provider] ${response.provider} (${response.model})`)
  for (const step of response.reasoning) emit('info', step)
  const raw = response.content
  const parsed = extractJson<GeneratedAnswer[]>(raw)

  const answers: GeneratedAnswer[] = (Array.isArray(parsed) ? parsed : []).map(
    (a) => ({
      questionId: String(a.questionId || ''),
      answer: String(a.answer || ''),
      reasoning: String(a.reasoning || ''),
      confidence: typeof a.confidence === 'number' ? a.confidence : 0.5,
      selectedOptionIndex:
        typeof a.selectedOptionIndex === 'number' ? a.selectedOptionIndex : undefined,
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
  emit: Emit,
  providerId?: string,
  userId?: string
): Promise<VerificationVerdict[]> {
  emit('info', 'Critic agent verifying Q&A pairs for correctness, ambiguity, leakage…')

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

  const response = await chat(
    [
      { role: 'system', content: 'Output only a raw JSON array.' },
      { role: 'user', content: prompt },
    ],
    { reasoning: true, provider: providerId, userId }
  )

  emit('info', `[provider] ${response.provider} (${response.model})`)
  for (const step of response.reasoning) emit('info', step)
  const raw = response.content
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

    // For MCQ questions, prefer the objective option-match signal over the
    // critic's prose-based correctness label — comparing indices is exact,
    // whereas the LLM verifier's "correct/partial/incorrect" judgment is
    // itself a model output that can be wrong in ways an index match can't.
    const isMcq = q.questionType === 'mcq'
    const optionMatch =
      isMcq && typeof a.selectedOptionIndex === 'number'
        ? a.selectedOptionIndex === q.correctOptionIndex
        : null

    const correctnessWeight =
      optionMatch !== null
        ? optionMatch
          ? 1
          : 0.15
        : v.correctness === 'correct'
        ? 1
        : v.correctness === 'partial'
        ? 0.6
        : 0.3
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
      questionType: q.questionType,
      options: q.options,
      correctOptionIndex: q.correctOptionIndex,
    })
  }

  // Sort: passed first, then by score descending
  items.sort((a, b) => {
    if (a.verification !== b.verification) return a.verification === 'pass' ? -1 : 1
    return b.score - a.score
  })

  return items
}
