import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { chat } from '@/lib/ai/providers'
import { extractJson } from '@/lib/pipeline/json'

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const question = await db.question.findUnique({
    where: { id },
    include: { run: true },
  })

  if (!question) {
    return NextResponse.json({ error: 'Question not found' }, { status: 404 })
  }

  const body = await req.json().catch(() => ({}))
  const { targetType } = body // "MCQ" or "SHORT"

  if (targetType === question.type) {
    return NextResponse.json({ error: 'Already of this type' }, { status: 400 })
  }

  try {
    if (targetType === 'SHORT') {
      // Local conversion: remove options and update type
      const updated = await db.question.update({
        where: { id },
        data: {
          type: 'SHORT',
          options: null,
        }
      })
      await syncRunFinalQA(question.runId)
      return NextResponse.json({
        ...updated,
        options: null,
      })
    }

    // Convert SHORT to MCQ: Generate options
    const extraction = question.run.extraction || '{}'
    const prompt = `Convert the following short-answer question into a multiple-choice question (MCQ) with exactly 4 options.

Diagram context:
${extraction}

Short-Answer Question:
"${question.text}"
Correct Answer:
"${question.answer}"

Rules:
1. Provide exactly 4 plausible options, where one is the correct answer and three are plausible distractors.
2. Maintain the same cognitive intent and core question.
3. Keep the explanation updated for MCQ context.

Return ONLY valid JSON in this exact format (do not wrap in markdown code blocks):
{
  "text": "<question text>",
  "options": ["<option A>", "<option B>", "<option C>", "<option D>"],
  "correctOptionIndex": 0,
  "answer": "<text of the correct option>",
  "explanation": "<explanation of why the correct option is right and others are distractors>"
}
`

    const result = await chat([
      { role: 'system', content: 'Output only valid raw JSON matching the requested schema.' },
      { role: 'user', content: prompt }
    ], {
      provider: question.run.provider || undefined,
      userId: session.user.id
    })

    const parsed = extractJson<{
      text: string
      options: string[]
      correctOptionIndex: number
      answer: string
      explanation: string
    }>(result.content)

    if (!parsed || !parsed.options || parsed.correctOptionIndex === undefined) {
      throw new Error('Invalid JSON response from model')
    }

    const updated = await db.question.update({
      where: { id },
      data: {
        type: 'MCQ',
        text: parsed.text || question.text,
        options: JSON.stringify(parsed.options),
        answer: parsed.answer || question.answer,
        explanation: parsed.explanation || question.explanation,
      }
    })

    await syncRunFinalQA(question.runId)

    return NextResponse.json({
      ...updated,
      options: JSON.parse(updated.options!),
    })
  } catch (e) {
    return NextResponse.json({
      error: 'Failed to convert question type',
      details: e instanceof Error ? e.message : String(e)
    }, { status: 500 })
  }
}

async function syncRunFinalQA(runId: string) {
  const questions = await db.question.findMany({
    where: { runId },
    orderBy: { createdAt: 'asc' },
  })

  const finalQA = questions.map((q) => ({
    id: q.id,
    question: q.text,
    answer: q.answer,
    bloomLevel: q.bloomLevel,
    verification: q.isApproved ? (q.verificationVerdict?.toLowerCase() || 'pass') : 'reject',
    score: q.verificationScore || 1.0,
    questionType: q.type.toLowerCase(),
    options: q.options ? JSON.parse(q.options) : undefined,
    explanation: q.explanation || undefined,
  }))

  await db.run.update({
    where: { id: runId },
    data: {
      finalQA: JSON.stringify(finalQA),
    },
  })
}
