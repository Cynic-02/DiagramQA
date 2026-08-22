import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { chat } from '@/lib/ai/providers'
import { extractJson } from '@/lib/pipeline/json'

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: runId } = await ctx.params
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const { questionId, studentAnswer } = body

  if (!questionId || studentAnswer === undefined) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }

  const question = await db.question.findUnique({
    where: { id: questionId },
  })

  if (!question) {
    return NextResponse.json({ error: 'Question not found' }, { status: 404 })
  }

  const prompt = `You are an expert AI instructor grading a student's answer for an exam.

Question:
"${question.text}"

Expected Correct Answer:
"${question.answer}"

Student's Submitted Answer:
"${studentAnswer}"

Evaluate the answer. Provide:
1. score: 0 to 100 based on core conceptual accuracy.
2. feedback: 2-3 sentences of targeted, constructive feedback.
3. conceptMastery: boolean (true if score >= 70).
4. weakConcepts: list of diagram entities/terms they did not explain correctly (empty if mastery is true).
5. studyTip: one actionable study advice related to this topic.

Return ONLY valid JSON (do not wrap in markdown code blocks):
{
  "score": 85,
  "feedback": "Your answer is correct. You correctly identified...",
  "conceptMastery": true,
  "weakConcepts": [],
  "studyTip": "To reinforce this, review how this node relates to..."
}
`

  try {
    const result = await chat([
      { role: 'system', content: 'Output only valid raw JSON.' },
      { role: 'user', content: prompt }
    ], {
      userId: session.id
    })

    const parsed = extractJson<{
      score: number
      feedback: string
      conceptMastery: boolean
      weakConcepts: string[]
      studyTip: string
    }>(result.content)

    return NextResponse.json(parsed)
  } catch (e) {
    return NextResponse.json({ error: 'Failed to grade answer' }, { status: 500 })
  }
}
