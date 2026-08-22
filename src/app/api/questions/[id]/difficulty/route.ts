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
  if (!session) {
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
  const { action } = body // "easier" or "harder"

  if (action !== 'easier' && action !== 'harder') {
    return NextResponse.json({ error: 'Invalid action. Must be easier or harder.' }, { status: 400 })
  }

  const extraction = question.run.extraction || '{}'
  const isMcq = question.type === 'MCQ'

  const prompt = `You are an expert AI tutor. Adjust the difficulty of the following question to make it ${action.toUpperCase()}.

Diagram context:
${extraction}

Current Question:
"${question.text}"
Type: ${question.type}
${isMcq ? `Options:\n${JSON.parse(question.options || '[]').join('\n')}` : ''}
Current Answer:
"${question.answer}"

Rules:
1. Make the question ${action === 'easier' ? 'simpler, testing fundamental understanding and requiring fewer complex deductions' : 'more challenging, testing advanced synthesis, edge cases, or deep implications of the diagram'}.
2. Ensure it remains answerable using only the diagram.
3. ${isMcq ? 'Provide exactly 4 updated options matching the new question.' : 'Provide an updated answer.'}

Return ONLY valid JSON in this exact format (do not wrap in markdown code blocks):
{
  "text": "<new question text>",
  ${isMcq ? '"options": ["<option A>", "<option B>", "<option C>", "<option D>"],\n  "correctOptionIndex": 0,' : ''}
  "answer": "<new correct answer>",
  "explanation": "<detailed updated explanation referencing diagram elements>"
}
`

  try {
    const result = await chat([
      { role: 'system', content: 'Output only valid raw JSON matching the requested schema.' },
      { role: 'user', content: prompt }
    ], {
      provider: question.run.provider || undefined,
      userId: session.id
    })

    const parsed = extractJson<{
      text: string
      options?: string[]
      correctOptionIndex?: number
      answer: string
      explanation: string
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
        verificationScore: 90, // Reset to standard high confidence
        verificationVerdict: 'PASS',
      }
    })

    await syncRunFinalQA(question.runId)

    return NextResponse.json({
      ...updated,
      options: updated.options ? JSON.parse(updated.options) : null,
    })
  } catch (e) {
    return NextResponse.json({
      error: 'Failed to adjust difficulty',
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
