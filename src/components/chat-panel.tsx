'use client'

/**
 * ChatPanel — the follow-up chatbot, as dock content.
 *
 * It used to be a floating bubble in the bottom-right corner plus a
 * `fixed` card portalled to document.body. Both are gone: the panel now
 * fills whatever container the ConsoleDock gives it, takes no props, and
 * reads the run straight from the store. No portal, no fixed positioning,
 * nothing overlapping the page.
 */

import * as React from 'react'
import { motion } from 'framer-motion'
import { Send, Sparkles, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProviderSelect } from '@/components/provider-select'
import { PenScribble } from '@/components/ui/pen-scribble'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { usePipelineStore } from '@/lib/store'
import { demoChatReply, isDemoRun } from '@/lib/demo-run'
import ReactMarkdown from 'react-markdown'

interface ChatMsg {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt?: string
}

const STARTERS = [
  'Which component is the single point of failure?',
  'Trace the full request path.',
  'What is this diagram missing?',
]

export function ChatPanel() {
  const runId = usePipelineStore((s) => s.runId)
  const finalQA = usePipelineStore((s) => s.finalQA)

  const [messages, setMessages] = React.useState<ChatMsg[]>([])
  const [input, setInput] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [loadingHistory, setLoadingHistory] = React.useState(false)
  const [provider, setProvider] = React.useState<string | null>(null)
  const scrollRef = React.useRef<HTMLDivElement>(null)

  const ready = !!runId && finalQA.length > 0
  const demo = isDemoRun(runId)

  // Load chat history when the run changes. A scripted demo run has no
  // server-side history — its whole conversation lives in this component.
  React.useEffect(() => {
    if (!runId || isDemoRun(runId)) return
    setLoadingHistory(true)
    fetch(`/api/chat?runId=${runId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.messages) setMessages(d.messages)
      })
      .catch(() => {})
      .finally(() => setLoadingHistory(false))
  }, [runId])

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, loading])

  const send = async (override?: string) => {
    const text = (override ?? input).trim()
    if (!text || !runId || loading) return

    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', content: text }])
    setInput('')
    setLoading(true)

    // Demo runs answer locally so the chatbot works with no key and no
    // account — the same contract as the rest of the scripted run.
    if (isDemoRun(runId)) {
      const reply = demoChatReply(text)
      window.setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { id: `a-${Date.now()}`, role: 'assistant', content: reply },
        ])
        setLoading(false)
      }, 480)
      return
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId, message: text, provider: provider ?? undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Chat failed')
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: 'assistant', content: data.reply },
      ])
    } catch (e) {
      toast.error('Could not get a response', {
        description: e instanceof Error ? e.message : undefined,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void send()
    }
  }

  /* ---- not ready: nothing to talk about yet ---- */
  if (!ready) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <span className="flex size-11 items-center justify-center border-[3px] border-[var(--line)] bg-[var(--yellow)] text-[#0a0a0a]">
          <Sparkles className="size-5" strokeWidth={2.5} />
        </span>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-2)]">
          No verified set yet
        </p>
        <p className="max-w-[240px] text-[11px] leading-relaxed text-[var(--ink-2)]">
          Finish a run and this becomes a tutor grounded in the extracted
          structure and the generated Q&amp;A.
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* provider — hidden for demo runs, which never call a model */}
      {!demo && (
        <div className="shrink-0 border-b-2 border-[var(--line)] px-2.5 py-2">
          <ProviderSelect
            value={provider}
            onChange={setProvider}
            className="h-8 w-full px-2 text-[11px]"
          />
        </div>
      )}
      {demo && (
        <div className="shrink-0 border-b-2 border-[var(--line)] bg-[var(--yellow)]/25 px-3 py-1.5">
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--ink)]">
            Scripted demo · answered offline
          </span>
        </div>
      )}

      {/* messages */}
      <div ref={scrollRef} className="scroll-slim min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {loadingHistory && messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <PenScribble size={20} className="text-[var(--ink-2)]" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col gap-3 pt-2">
            <p className="text-[11px] leading-relaxed text-[var(--ink-2)]">
              Grounded in the extracted structure and the generated set. Start
              with one of these:
            </p>
            {STARTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void send(s)}
                className="border-2 border-[var(--line)] bg-[var(--card)] px-3 py-2 text-left text-[11px] font-medium shadow-[3px_3px_0_var(--line)] transition-[transform,box-shadow] duration-[90ms] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none"
              >
                {s}
              </button>
            ))}
          </div>
        ) : (
          messages.map((msg) => <ChatBubble key={msg.id} msg={msg} />)
        )}

        {loading && (
          <div className="flex items-center gap-1.5 border-2 border-[var(--line)] bg-[var(--muted)] px-3 py-2">
            {[0, 150, 300].map((d) => (
              <span
                key={d}
                className="thinking-dot size-1.5 rounded-full bg-[var(--red)]"
                style={{ animationDelay: `${d}ms` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* input */}
      <div className="shrink-0 border-t-2 border-[var(--line)] p-2.5">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a follow-up…"
            rows={1}
            className="scroll-slim max-h-24 min-h-[38px] flex-1 resize-none border-2 border-[var(--line)] bg-[var(--card)] px-2.5 py-2 text-[11px] text-[var(--ink)] placeholder:text-[var(--ink-2)] focus:outline-none"
            disabled={loading}
          />
          <Button
            size="icon"
            onClick={() => void send()}
            disabled={!input.trim() || loading}
            className="size-[38px] shrink-0"
            aria-label="Send"
          >
            {loading ? <PenScribble size={16} /> : <Send className="size-3.5" />}
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function ChatBubble({ msg }: { msg: ChatMsg }) {
  const isUser = msg.role === 'user'
  const [copied, setCopied] = React.useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content)
    setCopied(true)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className={cn('group flex flex-col gap-1', isUser ? 'items-end' : 'items-stretch')}
    >
      <div className="flex items-center gap-1.5 px-0.5">
        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--ink-2)]">
          {isUser ? 'You' : 'Tutor'}
        </span>
        {!isUser && (
          <button
            type="button"
            onClick={handleCopy}
            title="Copy"
            className="opacity-0 transition-opacity group-hover:opacity-100"
          >
            {copied ? (
              <Check className="size-3 text-[var(--bloom-2)]" />
            ) : (
              <Copy className="size-3 text-[var(--ink-2)]" />
            )}
          </button>
        )}
      </div>

      <div
        className={cn(
          'border-2 border-[var(--line)] px-3 py-2 text-[11px] leading-relaxed',
          isUser
            ? 'max-w-[88%] bg-[var(--ink)] text-[var(--paper)]'
            : 'bg-[var(--card)] text-[var(--ink)] shadow-[3px_3px_0_var(--line)]',
        )}
      >
        {isUser ? (
          msg.content
        ) : (
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              strong: ({ children }) => (
                <strong className="font-bold text-[var(--ink)]">{children}</strong>
              ),
              ul: ({ children }) => (
                <ul className="mb-2 list-disc space-y-1 pl-4 last:mb-0">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="mb-2 list-decimal space-y-1 pl-4 last:mb-0">{children}</ol>
              ),
              li: ({ children }) => <li className="marker:text-[var(--red)]">{children}</li>,
              table: ({ children }) => (
                <div className="my-2 overflow-x-auto">
                  <table className="w-full border-collapse text-[10px]">{children}</table>
                </div>
              ),
              th: ({ children }) => (
                <th className="border-2 border-[var(--line)] bg-[var(--muted)] px-1.5 py-1 text-left font-bold">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="border-2 border-[var(--line)] px-1.5 py-1">{children}</td>
              ),
              code: ({ className, children, ...props }) => {
                const match = /language-(\w+)/.exec(className || '')
                return match ? (
                  <pre className="my-2 overflow-x-auto border-2 border-[var(--line)] bg-[var(--muted)] p-2 font-mono text-[10px]">
                    <code className={className} {...props}>
                      {children}
                    </code>
                  </pre>
                ) : (
                  <code className="bg-[var(--muted)] px-1 font-mono text-[10px]" {...props}>
                    {children}
                  </code>
                )
              },
            }}
          >
            {msg.content}
          </ReactMarkdown>
        )}
      </div>
    </motion.div>
  )
}
