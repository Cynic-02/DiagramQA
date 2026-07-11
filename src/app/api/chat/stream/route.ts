import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { streamChat, type ChatMessage } from '@/lib/ai/providers'
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
 * POST /api/chat/stream
 * Body: { runId, message, provider?, reasoning? }
 *
 * Streams the chat response as SSE (Server-Sent Events), including
 * chain-of-thought reasoning chunks. Each SSE event is a JSON object:
 *   { delta?: string, reasoningDelta?: string, done?: boolean, provider?: string }
 */
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { runId, message, provider, reasoning } = (await req.json()) as {
    runId: string
    message: string
    provider?: string
    reasoning?: boolean
  }

  if (!runId || !message?.trim()) {
    return new Response('Missing runId or message', { status: 400 })
  }

  const run = await db.run.findUnique({
    where: { id: runId },
    include: { diagram: true },
  })
  if (!run) {
    return new Response('Run not found', { status: 404 })
  }

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

  const systemPrompt = `You are a helpful tutor assistant for the AR2-DDCQG platform. The user uploaded a diagram and an AI pipeline extracted its structure and generated verified questions. Answer the user's follow-up questions about the diagram using the context below.

Diagram context (JSON):
${JSON.stringify(context, null, 2)}

Guidelines:
- Match the user's desired level of detail.
- Use clear structure: bullet points, numbered steps, or paragraphs.
- Maintain context across the conversation.`

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history.map((m) => ({
      role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.content,
    })),
  ]

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      let fullContent = ''
      let usedProvider = ''
      try {
        for await (const chunk of streamChat(messages, {
          provider,
          reasoning: reasoning ?? true,
          userId: session.id,
        })) {
          if (chunk.delta) fullContent += chunk.delta
          if (chunk.done) usedProvider = ''
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`)
          )
        }
        // save the assistant response
        await db.chatMessage.create({
          data: { runId, userId: session.id, role: 'assistant', content: fullContent },
        })
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              error: err instanceof Error ? err.message : 'Stream failed',
            })}\n\n`
          )
        )
      } finally {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`)
        )
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
