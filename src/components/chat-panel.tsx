'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, MessageSquare, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ProviderSelect } from '@/components/provider-select'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ChatMsg {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt?: string
}

interface ChatPanelProps {
  runId: string | null
  open: boolean
  onOpenChange: (v: boolean) => void
}

/**
 * ChatPanel — a sliding right-side panel for follow-up Q&A about the diagram.
 * Uses the /api/chat endpoint which grounds answers in the extraction +
 * generated Q&A context. Persists conversation to the DB.
 */
export function ChatPanel({ runId, open, onOpenChange }: ChatPanelProps) {
  const [messages, setMessages] = React.useState<ChatMsg[]>([])
  const [input, setInput] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [loadingHistory, setLoadingHistory] = React.useState(false)
  const [provider, setProvider] = React.useState<string | null>(null)
  const scrollRef = React.useRef<HTMLDivElement>(null)

  // Load chat history when the panel opens (or runId changes)
  React.useEffect(() => {
    if (!open || !runId) return
    setLoadingHistory(true)
    fetch(`/api/chat?runId=${runId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.messages) setMessages(d.messages)
      })
      .catch(() => {})
      .finally(() => setLoadingHistory(false))
  }, [open, runId])

  // Auto-scroll to bottom on new messages
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  const send = async () => {
    const text = input.trim()
    if (!text || !runId || loading) return

    const userMsg: ChatMsg = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

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
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: data.reply,
        },
      ])
    } catch (e) {
      toast.error('Could not get a response', {
        description: e instanceof Error ? e.message : undefined,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, x: 40, scale: 0.97 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 40, scale: 0.97 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="brutal-block fixed bottom-4 right-4 z-40 flex h-[min(600px,calc(100vh-2rem))] w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden bg-card"
        >
          {/* Header */}
          <div className="flex h-12 shrink-0 items-center justify-between border-b-[3px] border-border px-4">
            <div className="flex items-center gap-2">
              <div className="flex size-6 items-center justify-center border-[2px] border-border bg-accent text-accent-foreground">
                <MessageSquare className="size-3.5" />
              </div>
              <div className="leading-tight">
                <div className="text-[13px] font-bold">Follow-up Q&amp;A</div>
                <div className="text-[10px] text-muted-foreground">
                  Ask about this diagram
                </div>
              </div>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="inline-flex size-7 items-center justify-center border-[2px] border-transparent text-muted-foreground transition-colors hover:border-border hover:bg-destructive hover:text-destructive-foreground"
              aria-label="Close chat"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Provider picker */}
          <div className="shrink-0 border-b-[2px] border-border px-3 py-2">
            <ProviderSelect value={provider} onChange={setProvider} className="h-8 w-full text-xs" />
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="scroll-slim flex-1 space-y-3 overflow-y-auto p-4"
          >
            {loadingHistory && messages.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <div className="flex size-10 items-center justify-center border-[2px] border-border bg-accent text-accent-foreground">
                  <Sparkles className="size-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground/80">
                    Ask anything about this diagram
                  </p>
                  <p className="mx-auto max-w-[260px] text-xs text-muted-foreground">
                    The assistant is grounded in the extracted structure and
                    generated Q&amp;A. Try &quot;Explain the relationship
                    between X and Y.&quot;
                  </p>
                </div>
              </div>
            ) : (
              messages.map((msg) => <ChatBubble key={msg.id} msg={msg} />)
            )}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 border-[2px] border-border bg-card px-3 py-2">
                  <span className="thinking-dot size-1.5 rounded-full bg-accent" />
                  <span
                    className="thinking-dot size-1.5 rounded-full bg-accent"
                    style={{ animationDelay: '150ms' }}
                  />
                  <span
                    className="thinking-dot size-1.5 rounded-full bg-accent"
                    style={{ animationDelay: '300ms' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="shrink-0 border-t-[3px] border-border p-3">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a follow-up question…"
                rows={1}
                className="scroll-slim max-h-28 min-h-[40px] flex-1 resize-none border-[2px] border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
                disabled={loading}
              />
              <Button
                size="icon"
                onClick={send}
                disabled={!input.trim() || loading}
                className="brutal-block brutal-interactive size-10 shrink-0"
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function ChatBubble({ msg }: { msg: ChatMsg }) {
  const isUser = msg.role === 'user'
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn('flex', isUser ? 'justify-end' : 'justify-start')}
    >
      <div
        className={cn(
          'max-w-[85%] border-[2px] border-border px-3.5 py-2 text-sm leading-relaxed',
          isUser
            ? 'bg-accent text-accent-foreground'
            : 'bg-card text-foreground/90'
        )}
      >
        {msg.content}
      </div>
    </motion.div>
  )
}
