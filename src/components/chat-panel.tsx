'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, MessageSquare, Sparkles, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProviderSelect } from '@/components/provider-select'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'

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
 * ChatPanel — a premium, floating chatbot panel widget in the bottom-right corner.
 * Triggered by a circular FAB bubble with pulsing notification dot.
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

  // Render through a portal straight to document.body. This makes the
  // widget's `fixed` positioning immune to any ancestor applying a CSS
  // transform/filter/perspective anywhere in the tree — any of those
  // creates a new "containing block" for fixed-position descendants,
  // silently repositioning them relative to that ancestor instead of the
  // real viewport. That's a real, hard-to-spot class of bug (page
  // transition animations, stage transitions, etc. all use transforms),
  // so a portal sidesteps it permanently rather than requiring every
  // future animated wrapper to remember not to break this.
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  const content = (
    <>
      {/* Floating Chat Trigger — larger, labeled, impossible to miss */}
      {!open && (
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          className="fixed bottom-6 right-6 z-[100] flex h-14 items-center gap-2 rounded-full border-2 border-border bg-primary text-primary-foreground px-5 shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
          aria-label="Ask a follow-up question about this diagram"
        >
          <MessageSquare className="size-5" />
          <span className="text-sm font-bold whitespace-nowrap">Ask a follow-up</span>
          <span className="absolute -top-1 -right-1 flex size-3.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75"></span>
            <span className="relative inline-flex size-3.5 rounded-full border-2 border-card bg-accent"></span>
          </span>
        </button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="brutal-block !fixed bottom-6 right-6 z-[90] flex h-[min(540px,calc(100vh-7rem))] w-[min(400px,calc(100vw-2.5rem))] flex-col overflow-hidden !bg-card !backdrop-filter-none"
          >
            {/* Header */}
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/60 px-4">
              <div className="flex items-center gap-2">
                <div className="flex size-6 items-center justify-center border border-border bg-accent text-accent-foreground rounded-md">
                  <MessageSquare className="size-3.5" />
                </div>
                <div className="leading-tight">
                  <div className="text-[12px] font-bold">Follow-up Q&amp;A</div>
                  <div className="text-[9px] text-muted-foreground">
                    Ask about this diagram
                  </div>
                </div>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="inline-flex size-6 items-center justify-center border border-transparent text-muted-foreground rounded hover:border-border hover:bg-destructive hover:text-white transition-all cursor-pointer"
                aria-label="Close chat"
              >
                <X className="size-3.5" />
              </button>
            </div>

            {/* Provider picker */}
            <div className="shrink-0 border-b border-border/40 px-3 py-1.5 bg-muted/20">
              <ProviderSelect value={provider} onChange={setProvider} className="h-7 w-full text-[10px] px-2.5 py-0" />
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="scroll-slim flex-1 space-y-3 overflow-y-auto p-4"
            >
              {loadingHistory && messages.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <PenScribble size={20} className="text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2.5 text-center p-2">
                  <div className="flex size-9 items-center justify-center border border-border bg-accent text-accent-foreground rounded-lg">
                    <Sparkles className="size-4.5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-foreground/80">
                      Ask anything about this diagram
                    </p>
                    <p className="mx-auto max-w-[220px] text-[10px] text-muted-foreground leading-normal">
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
                <div className="flex justify-start items-start gap-2">
                  <div className="shrink-0 flex items-center justify-center size-7 rounded-full border-2 border-accent/50 overflow-hidden bg-muted/40 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/images/teacher.svg" alt="Teacher" className="size-5 object-contain" />
                  </div>
                  <div className="flex items-center gap-1.5 border border-border bg-muted/30 px-3 py-1.5 rounded-2xl rounded-tl-none">
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
            <div className="shrink-0 border-t border-border/60 p-3 bg-muted/10">
              <div className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a follow-up question…"
                  rows={1}
                  className="scroll-slim max-h-24 min-h-[38px] flex-1 resize-none border border-border/80 bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none rounded-lg"
                  disabled={loading}
                />
                <Button
                  size="icon"
                  onClick={send}
                  disabled={!input.trim() || loading}
                  className="brutal-interactive size-9 shrink-0 rounded-lg cursor-pointer"
                >
                  {loading ? (
                    <PenScribble size={16} className="text-primary-foreground" />
                  ) : (
                    <Send className="size-3.5" />
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )

  if (!mounted) return null
  return createPortal(content, document.body)
}

function ChatBubble({ msg }: { msg: ChatMsg }) {
  const isUser = msg.role === 'user'
  const [copied, setCopied] = React.useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content)
    setCopied(true)
    toast.success('Explanation copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const Avatar = (
    <div
      className={cn(
        'shrink-0 flex items-center justify-center size-7 rounded-full border-2 overflow-hidden bg-muted/40 shadow-sm',
        isUser ? 'border-primary/40' : 'border-accent/50'
      )}
      title={isUser ? 'You (Student)' : 'AI Teacher'}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={isUser ? '/images/student.svg' : '/images/teacher.svg'}
        alt={isUser ? 'Student' : 'Teacher'}
        className="size-5 object-contain"
      />
    </div>
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className={cn('flex group relative items-start gap-2', isUser ? 'justify-end' : 'justify-start')}
    >
      {/* Teacher avatar + copy button for AI messages */}
      {!isUser && (
        <div className="flex flex-col items-center gap-1 shrink-0">
          {Avatar}
          <button
            onClick={handleCopy}
            type="button"
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground shrink-0"
            title="Copy explanation"
          >
            {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
          </button>
        </div>
      )}

      <div
        className={cn(
          'max-w-[80%] border border-border/60 px-3.5 py-2 text-[11px] leading-relaxed rounded-2xl shadow-sm',
          isUser
            ? 'bg-primary text-primary-foreground rounded-tr-none'
            : 'bg-card text-foreground/90 rounded-tl-none'
        )}
      >
        {isUser ? (
          msg.content
        ) : (
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
              li: ({ children }) => <li className="marker:text-primary">{children}</li>,
              code: ({ className, children, ...props }) => {
                const match = /language-(\w+)/.exec(className || '')
                return match ? (
                  <pre className="overflow-x-auto rounded bg-muted/60 p-2 font-mono text-[10px] my-2 border border-border/40">
                    <code className={className} {...props}>
                      {children}
                    </code>
                  </pre>
                ) : (
                  <code className="rounded bg-muted/70 px-1 py-0.5 font-mono text-[10px]" {...props}>
                    {children}
                  </code>
                )
              },
              strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">
                  {children}
                </a>
              )
            }}
          >
            {msg.content}
          </ReactMarkdown>
        )}
      </div>

      {/* Student avatar for user messages */}
      {isUser && Avatar}
    </motion.div>
  )
}
