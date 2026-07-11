'use client'

import * as React from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot, Plus, Trash2, Sparkles, ArrowLeft, Loader2, Save, Globe, Lock, Brain, KeyRound
} from 'lucide-react'
import { toast } from 'sonner'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useProviderOptions, type ProviderOption } from '@/components/provider-select'
import { cn } from '@/lib/utils'

interface Agent {
  id: string
  name: string
  role: string
  prompt: string
  provider: string
  model: string | null
  isPublic: boolean
  isOwner: boolean
  createdAt: string
}

const PROVIDER_LIST = [
  { id: 'glm', label: 'GLM (Z.ai)', model: 'glm-4.6v' },
  { id: 'openai', label: 'OpenAI (ChatGPT)', model: 'gpt-4o' },
  { id: 'deepseek', label: 'DeepSeek', model: 'deepseek-chat' },
  { id: 'claude', label: 'Anthropic Claude', model: 'claude-sonnet-4-20250514' },
  { id: 'gemini', label: 'Google Gemini', model: 'gemini-2.0-flash' },
  { id: 'grok', label: 'xAI Grok', model: 'grok-2-latest' },
  { id: 'groq', label: 'Groq', model: 'llama-3.3-70b-versatile' },
  { id: 'qwen', label: 'Qwen (Alibaba)', model: 'qwen-plus' },
  { id: 'kimi', label: 'Kimi (Moonshot)', model: 'moonshot-v1-32k' },
]

export default function AgentsPage() {
  const [agents, setAgents] = React.useState<Agent[]>([])
  const [loading, setLoading] = React.useState(true)
  const [showForm, setShowForm] = React.useState(false)
  const { providers: providerOptions } = useProviderOptions()

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/agents')
      const data = await res.json()
      setAgents(data.agents || [])
    } catch {
      toast.error('Failed to load agents')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/agents/${id}`, { method: 'DELETE' })
      setAgents((prev) => prev.filter((a) => a.id !== id))
      toast.success('Agent deleted')
    } catch {
      toast.error('Delete failed')
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col grid-faint-lighter">
      {/* Nav */}
      <nav className="sticky top-0 z-50 w-full flex h-14 items-center justify-between border-b border-border/40 bg-background/80 backdrop-blur-md px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" asChild>
            <Link href="/app"><ArrowLeft className="size-3" />Console</Link>
          </Button>
          <span className="text-border">/</span>
          <span className="text-xs text-muted-foreground">Custom Agents</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" asChild>
            <Link href="/app/settings/api-keys"><KeyRound className="size-3" />API Keys</Link>
          </Button>
          <ThemeToggle />
        </div>
      </nav>

      <div className="relative z-10 mx-auto w-full max-w-5xl flex-1 p-6 md:p-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center border border-primary/45 bg-primary/10 text-primary rounded-lg">
                <Bot className="size-5" />
              </div>
              <h1 className="text-2xl font-black tracking-tight md:text-[28px]">
                Custom <span className="text-secondary">Agents</span>
              </h1>
            </div>
            <p className="max-w-xl text-sm text-muted-foreground">
              Define custom AI agents with specific roles and prompts. Choose
              from 9 AI providers (DeepSeek, Claude, Gemini, Grok, and more).
              Agents can be private or shared publicly.
            </p>
          </div>
          <Button onClick={() => setShowForm((v) => !v)} className="shrink-0 gap-1.5">
            <Plus className="size-4" />
            New agent
          </Button>
        </div>

        {/* Create form */}
        <AnimatePresence>
          {showForm && (
            <AgentForm
              providerOptions={providerOptions}
              onClose={() => setShowForm(false)}
              onCreated={() => { setShowForm(false); load() }}
            />
          )}
        </AnimatePresence>

        {/* Agent list */}
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : agents.length === 0 ? (
          <Card className="brutal-block flex flex-col items-center justify-center gap-3 p-12 text-center">
            <div className="flex size-12 items-center justify-center border border-border/70 bg-muted text-muted-foreground rounded-lg">
              <Sparkles className="size-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground/80">No agents yet</p>
              <p className="mx-auto max-w-sm text-xs text-muted-foreground">
                Create your first custom agent to define its role, prompt, and
                preferred AI provider.
              </p>
            </div>
            <Button onClick={() => setShowForm(true)} className="mt-2 gap-1.5">
              <Plus className="size-4" /> Create agent
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {agents.map((agent, i) => (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <AgentCard agent={agent} providerOptions={providerOptions} onDelete={() => handleDelete(agent.id)} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function AgentForm({
  providerOptions,
  onClose,
  onCreated,
}: {
  providerOptions: ProviderOption[]
  onClose: () => void
  onCreated: () => void
}) {
  const [name, setName] = React.useState('')
  const [role, setRole] = React.useState('')
  const [prompt, setPrompt] = React.useState('')
  const [provider, setProvider] = React.useState('glm')
  const [model, setModel] = React.useState('')
  const [isPublic, setIsPublic] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  const customOptions = providerOptions.filter((p) => p.isCustom)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !role.trim() || !prompt.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, role, prompt, provider, model, isPublic }),
      })
      if (!res.ok) throw new Error('Failed to create agent')
      toast.success('Agent created')
      onCreated()
    } catch {
      toast.error('Could not create agent')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden"
    >
      <Card className="brutal-block mb-6 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-2">
            <Brain className="size-4 text-primary" />
            <h3 className="text-sm font-bold">Create a custom agent</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Diagram Analyzer"
                className="h-10"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Role</Label>
              <Input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Senior architecture reviewer"
                className="h-10"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Custom prompt / instructions</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="You are a senior architect who analyzes diagrams for scalability issues. Focus on bottleneck detection and suggest improvements..."
              className="min-h-[100px] resize-y"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">AI Provider</Label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDER_LIST.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                  {customOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label} (your provider)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Model override (optional)</Label>
              <Input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={PROVIDER_LIST.find((p) => p.id === provider)?.model || ''}
                className="h-10"
              />
            </div>
          </div>

          <div className="brutal-block-sm flex items-center justify-between bg-muted px-4 py-3">
            <div className="flex items-center gap-2">
              {isPublic ? <Globe className="size-4 text-primary" /> : <Lock className="size-4 text-muted-foreground" />}
              <div>
                <p className="text-xs font-bold">Share publicly</p>
                <p className="text-[10px] text-muted-foreground">Other users can see and use this agent</p>
              </div>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Save agent
            </Button>
          </div>
        </form>
      </Card>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */

function AgentCard({
  agent,
  providerOptions,
  onDelete,
}: {
  agent: Agent
  providerOptions: ProviderOption[]
  onDelete: () => void
}) {
  const providerLabel =
    PROVIDER_LIST.find((p) => p.id === agent.provider)?.label
    || providerOptions.find((p) => p.id === agent.provider)?.label
    || agent.provider
  return (
    <Card className="brutal-block brutal-interactive group p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center border border-primary/45 bg-primary/10 text-primary rounded-lg">
            <Bot className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold leading-tight">{agent.name}</h3>
            <p className="text-xs text-muted-foreground">{agent.role}</p>
          </div>
        </div>
        {agent.isOwner && (
          <button
            onClick={onDelete}
            className="border border-transparent rounded p-1.5 text-muted-foreground opacity-0 transition-all hover:border-destructive/30 hover:bg-destructive/15 hover:text-destructive focus:opacity-100 group-hover:opacity-100"
            aria-label="Delete agent"
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>

      <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
        {agent.prompt}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px]">
        <span className="inline-flex items-center gap-1 border border-border/70 bg-muted/65 rounded-full px-2 py-0.5 font-mono font-bold">
          {providerLabel}
        </span>
        {agent.model && (
          <span className="inline-flex items-center gap-1 border border-border/70 bg-muted/65 rounded-full px-2 py-0.5 font-mono font-bold">
            {agent.model}
          </span>
        )}
        {agent.isPublic && (
          <span className="inline-flex items-center gap-1 border border-primary/30 bg-primary/10 rounded-full px-2 py-0.5 font-bold text-primary">
            <Globe className="size-2.5" /> Public
          </span>
        )}
      </div>
    </Card>
  )
}
