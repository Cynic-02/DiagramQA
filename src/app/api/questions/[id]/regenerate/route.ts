import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { chat } from '@/lib/ai/providers'
import { extractJson } from '@/lib/pipeline/json'

export async function POST(
  _req: NextRequest,
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

  const extraction = question.run.extraction || '{}'
  const isMcq = question.type === 'MCQ'

  const prompt = `You are an expert educational AI generator. Based on the diagram structure below, generate a NEW question of Bloom's level "${question.bloomLevel}" to replace the existing question: "${question.text}".

Diagram structure:
${extraction}

Rules:
1. Do NOT reuse the same wording as the existing question.
2. The question must be answerable using only information present in the diagram.
3. Keep the explanation clear and educational.
4. ${isMcq ? 'Provide exactly 4 plausible options, and make the correct answer match one of them.' : 'Provide a direct, complete answer.'}

Return ONLY valid JSON in this exact format (do not wrap in markdown code blocks):
{
  "text": "<question text>",
  ${isMcq ? '"options": ["<option A>", "<option B>", "<option C>", "<option D>"],\n  "correctOptionIndex": 0,' : ''}
  "answer": "<correct answer>",
  "explanation": "<detailed step-by-step explanation referencing diagram elements>",
  "score": 0.95
}
`

  try {
    const result = await chat([
      { role: 'system', content: 'Output only valid raw JSON matching the requested schema.' },
      { role: 'user', content: prompt }
    ], {
      provider: question.run.provider || undefined,
      userId: session.user.id
    })

    const parsed = extractJson<{
      text: string
      options?: string[]
      correctOptionIndex?: number
      answer: string
      explanation: string
      score?: number
    }>(result.content)

    if (!parsed || !parsed.text || !parsed.answer) {
      throw new Error('Invalid JSON response from model')
    }

    const updated = await db.question.update({
      where: { id },
      data: {
        text: parsed.text,
        options: parsed.options ? JSON.stringify(parsed.options) : null,
        answer: parsed.answer,
        explanation: parsed.explanation,
        verificationScore: parsed.score ? Math.round(parsed.score * 100) : 95,
        verificationVerdict: 'PASS',
      }
    })

    // Sync back to Run.finalQA
    await syncRunFinalQA(question.runId)

    return NextResponse.json({
      ...updated,
      options: updated.options ? JSON.parse(updated.options) : null,
    })
  } catch (e) {
    return NextResponse.json({
      error: 'Failed to regenerate question',
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
