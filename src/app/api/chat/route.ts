import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { assertRunAccess, readJson } from '@/lib/api'
import { chat, type ChatMessage } from '@/lib/ai/providers'
import type { ExtractionOutput, FinalQAItem } from '@/lib/types'

function parse<T>(s: string | null | undefined): T | undefined {
  if (!s) return undefined
  try {
    return JSON.parse(s) as T
  } catch {
    return undefined
  }
}

/**
 * POST /api/chat
 * Body: { runId, message, provider?, reasoning? }
 *
 * Follow-up Q&A about the diagram. Uses the AI provider abstraction layer
 * with multi-provider fallback. Returns content + reasoning (chain-of-thought).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: body, response } = await readJson<{
      runId: string
      message: string
      provider?: string
      reasoning?: boolean
    }>(req)
    if (response) return response

    const runId = typeof body?.runId === 'string' ? body.runId.trim() : ''
    const message = typeof body?.message === 'string' ? body.message.trim() : ''
    const provider = typeof body?.provider === 'string' ? body.provider.trim() : undefined
    const reasoning = body?.reasoning

    if (!runId || !message) {
      return NextResponse.json(
        { error: 'runId and message are required' },
        { status: 400 }
      )
    }

    const { run, response: accessResponse } = await assertRunAccess(runId, session, true)
    if (accessResponse) return accessResponse
    if (!run) return NextResponse.json({ error: 'Run not found' }, { status: 404 })

    const extraction = parse<ExtractionOutput>(run.extraction)
    const finalQA = parse<FinalQAItem[]>(run.finalQA) ?? []

    await db.chatMessage.create({
      data: { runId, userId: session.id, role: 'user', content: message },
    })

    const history = await db.chatMessage.findMany({
      where: { runId, userId: session.id },
      orderBy: { createdAt: 'asc' },
      take: 10,
    })

    const context = {
      diagramType: extraction?.diagramType ?? run.diagramType ?? 'unknown',
      summary: extraction?.summary ?? '',
      entities: extraction?.entities ?? [],
      relationships: extraction?.relationships ?? [],
      generatedQA: finalQA.map((q) => ({
        question: q.question,
        answer: q.answer,
        bloomLevel: q.bloomLevel,
      })),
    }

    const systemPrompt = `You are a helpful tutor assistant for the DiagramMind platform. The user uploaded a diagram and an AI pipeline extracted its structure and generated verified questions. Answer the user's follow-up questions about the diagram using the context below.

Diagram context (JSON):
${JSON.stringify(context, null, 2)}

Guidelines:
- Ground every answer in the extracted entities/relationships or the generated Q&A.
- Match the user's desired level of detail: if they ask for an elaborated or detailed answer, provide a thorough, in-depth explanation with full reasoning, examples, and step-by-step breakdowns. If they want a quick answer, be brief.
- When explaining relationships, trace the full path through the diagram and explain WHY each connection matters.
- Use clear structure: you may use bullet points, numbered steps, or paragraphs as appropriate for the depth of the answer.
- If the user asks about something not in the diagram, say "That isn't covered by this diagram" and suggest what they COULD ask about based on the extracted structure.
- You may reference specific entities or relationships by name.
- This is a conversational chatbot — the user can ask unlimited follow-up questions. Maintain context across the conversation and refer back to earlier Q&A when relevant.`

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history.map((m) => ({
        role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.content,
      })),
    ]

    const result = await chat(messages, {
      provider,
      reasoning: reasoning ?? true,
      userId: session.id,
    })

    await db.chatMessage.create({
      data: { runId, userId: session.id, role: 'assistant', content: result.content },
    })

    return NextResponse.json({
      reply: result.content,
      reasoning: result.reasoning,
      provider: result.provider,
      model: result.model,
    })
  } catch (err) {
    console.error('[chat]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Chat failed' },
      { status: 500 }
    )
  }
}

/** GET — load chat history for a run */
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const runId = new URL(req.url).searchParams.get('runId')
  if (!runId) {
    return NextResponse.json({ error: 'runId required' }, { status: 400 })
  }
  const { response } = await assertRunAccess(runId, session)
  if (response) return response
  const messages = await db.chatMessage.findMany({
    where: { runId, userId: session.id },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json({
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    })),
  })
}
