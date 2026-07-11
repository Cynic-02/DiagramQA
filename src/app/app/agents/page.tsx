'use client'

import * as React from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot, Plus, Trash2, Sparkles, ArrowLeft, Loader2, Save, Globe, Lock, Brain, KeyRound, Edit2, RotateCcw
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
  isSystem?: boolean
  hasOverride?: boolean
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
  const [customAgents, setCustomAgents] = React.useState<Agent[]>([])
  const [systemAgents, setSystemAgents] = React.useState<Agent[]>([])
  const [loading, setLoading] = React.useState(true)
  const [showForm, setShowForm] = React.useState(false)
  const [editingAgent, setEditingAgent] = React.useState<Agent | null>(null)
  const { providers: providerOptions } = useProviderOptions()

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/agents')
      const data = await res.json()
      setCustomAgents(data.agents || [])
      setSystemAgents(data.systemAgents || [])
    } catch {
      toast.error('Failed to load agents')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/agents/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Agent deleted')
      load()
    } catch {
      toast.error('Delete failed')
    }
  }

  const handleResetSystem = async (id: string) => {
    try {
      const res = await fetch(`/api/agents/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('System agent reset to default prompts')
      load()
    } catch {
      toast.error('Reset failed')
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col grid-faint-lighter bg-background text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-50 w-full flex h-14 items-center justify-between border-b border-border/40 bg-background/85 backdrop-blur-md px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-[11px] font-bold" asChild>
            <Link href="/app"><ArrowLeft className="size-3" />Console</Link>
          </Button>
          <span className="text-border">/</span>
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Agents &amp; Prompt Editor</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-[11px] font-bold" asChild>
            <Link href="/app/settings/api-keys"><KeyRound className="size-3" />API Keys</Link>
          </Button>
          <ThemeToggle />
        </div>
      </nav>

      <div className="relative z-10 mx-auto w-full max-w-5xl flex-1 p-6 md:p-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center border border-primary/45 bg-primary/10 text-primary rounded-lg">
                <Brain className="size-5" />
              </div>
              <h1 className="text-2xl font-black tracking-tight md:text-[28px] uppercase">
                Agent &amp; Prompt <span className="text-primary">Editor</span>
              </h1>
            </div>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Customize the system instructions of the core pipeline agents, or build your own custom agents. 
              Changes are saved to your account and apply to all future runs.
            </p>
          </div>
          <Button onClick={() => { setEditingAgent(null); setShowForm((v) => !v) }} className="shrink-0 gap-1.5 rounded-full brutal-interactive">
            <Plus className="size-4" />
            New custom agent
          </Button>
        </div>

        {/* Create Form */}
        <AnimatePresence>
          {showForm && (
            <AgentForm
              providerOptions={providerOptions}
              onClose={() => setShowForm(false)}
              onCreated={() => { setShowForm(false); load() }}
            />
          )}
        </AnimatePresence>

        {/* Edit Form */}
        <AnimatePresence>
          {editingAgent && (
            <AgentForm
              providerOptions={providerOptions}
              agentToEdit={editingAgent}
              onClose={() => setEditingAgent(null)}
              onCreated={() => { setEditingAgent(null); load() }}
            />
          )}
        </AnimatePresence>

        {loading && customAgents.length === 0 && systemAgents.length === 0 ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-12">
            {/* Core Pipeline Section */}
            <div className="space-y-4">
              <div className="border-b border-border/40 pb-2">
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-muted-foreground">
                  Core Pipeline Agents
                </h2>
                <p className="text-xs text-muted-foreground">
                  These 4 agents execute the visual analysis, question composing, solving, and grounding critic checks.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {systemAgents.map((agent) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    providerOptions={providerOptions}
                    onEdit={() => { setShowForm(false); setEditingAgent(agent) }}
                    onReset={() => handleResetSystem(agent.id)}
                  />
                ))}
              </div>
            </div>

            {/* Custom Agents Section */}
            <div className="space-y-4">
              <div className="border-b border-border/40 pb-2">
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-muted-foreground">
                  Your Custom Agents
                </h2>
              </div>
              {customAgents.length === 0 ? (
                <Card className="brutal-block flex flex-col items-center justify-center gap-3 p-10 text-center">
                  <div className="flex size-10 items-center justify-center border border-border/70 bg-muted text-muted-foreground rounded-lg">
                    <Bot className="size-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-foreground/80">No custom agents yet</p>
                    <p className="mx-auto max-w-sm text-[11px] text-muted-foreground leading-normal">
                      Create specialized custom agents with customized LLM credentials for specific course tasks.
                    </p>
                  </div>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {customAgents.map((agent) => (
                    <AgentCard
                      key={agent.id}
                      agent={agent}
                      providerOptions={providerOptions}
                      onEdit={() => { setShowForm(false); setEditingAgent(agent) }}
                      onDelete={() => handleDelete(agent.id)}
                    />
                  ))}
                </div>
              )}
            </div>
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
  agentToEdit,
}: {
  providerOptions: ProviderOption[]
  onClose: () => void
  onCreated: () => void
  agentToEdit?: Agent | null
}) {
  const isEditing = !!agentToEdit
  const isSystem = agentToEdit?.isSystem === true

  const [name, setName] = React.useState(agentToEdit?.name ?? '')
  const [role, setRole] = React.useState(agentToEdit?.role ?? '')
  const [prompt, setPrompt] = React.useState(agentToEdit?.prompt ?? '')
  const [provider, setProvider] = React.useState(agentToEdit?.provider ?? 'glm')
  const [model, setModel] = React.useState(agentToEdit?.model ?? '')
  const [isPublic, setIsPublic] = React.useState(agentToEdit?.isPublic ?? false)
  const [saving, setSaving] = React.useState(false)

  const customOptions = providerOptions.filter((p) => p.isCustom)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !role.trim() || !prompt.trim()) return
    setSaving(true)
    try {
      let url = '/api/agents'
      let method = 'POST'
      
      // If editing a custom agent, send a PATCH request
      if (isEditing && !isSystem) {
        url = `/api/agents/${agentToEdit.id}`
        method = 'PATCH'
      }

      const body = { name, role, prompt, provider, model: model || null, isPublic }
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      
      toast.success(isEditing ? 'Instructions updated' : 'Agent created')
      onCreated()
    } catch {
      toast.error('Could not save agent configuration')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="brutal-block mb-6 p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-2">
          <Brain className="size-4 text-primary" />
          <h3 className="text-xs font-bold uppercase tracking-wider">
            {isEditing ? `Edit ${isSystem ? 'System instructions' : 'Custom agent'}` : 'Create a custom agent'}
          </h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold uppercase text-muted-foreground">Agent Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Diagram Analyzer"
              className="h-10 text-xs"
              required
              disabled={isSystem} // Cannot rename system agents
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold uppercase text-muted-foreground">Role / Identifier</Label>
            <Input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Senior architecture reviewer"
              className="h-10 text-xs"
              required
              disabled={isSystem} // Cannot change system agent role identifiers
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] font-bold uppercase text-muted-foreground">System Instructions (Prompt Template)</Label>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Write details of how this agent should act..."
            className="min-h-[180px] resize-y text-xs font-mono leading-relaxed"
            required
          />
          {isSystem && (
            <p className="text-[10px] text-muted-foreground">
              ⚠️ Be careful to preserve templated parameters (like <code>{"{{STRUCTURE}}"}</code>, <code>{"{{QUESTIONS}}"}</code>, etc.) so that run data compiles correctly!
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold uppercase text-muted-foreground">AI Provider</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger className="h-10 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROVIDER_LIST.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    {p.label}
                  </SelectItem>
                ))}
                {customOptions.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    {p.label} (Custom)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold uppercase text-muted-foreground">Model Override (Optional)</Label>
            <Input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={PROVIDER_LIST.find((p) => p.id === provider)?.model || ''}
              className="h-10 text-xs"
            />
          </div>
        </div>

        {!isSystem && (
          <div className="brutal-block-sm flex items-center justify-between bg-muted/30 px-4 py-3 rounded-lg border border-border/40">
            <div className="flex items-center gap-2">
              {isPublic ? <Globe className="size-4 text-primary" /> : <Lock className="size-4 text-muted-foreground" />}
              <div>
                <p className="text-xs font-bold">Share Publicly</p>
                <p className="text-[10px] text-muted-foreground">Allow other accounts to use this agent</p>
              </div>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} className="rounded-full text-xs h-9">
            Cancel
          </Button>
          <Button type="submit" disabled={saving} className="gap-1.5 rounded-full text-xs h-9 brutal-interactive">
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            Save instructions
          </Button>
        </div>
      </form>
    </Card>
  )
}

/* ------------------------------------------------------------------ */

function AgentCard({
  agent,
  providerOptions,
  onEdit,
  onDelete,
  onReset,
}: {
  agent: Agent
  providerOptions: ProviderOption[]
  onEdit: () => void
  onDelete?: () => void
  onReset?: () => void
}) {
  const providerLabel =
    PROVIDER_LIST.find((p) => p.id === agent.provider)?.label
    || providerOptions.find((p) => p.id === agent.provider)?.label
    || agent.provider

  const isSystem = agent.isSystem === true

  return (
    <Card className="brutal-block group p-5 flex flex-col justify-between h-56">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center border border-primary/45 bg-primary/10 text-primary rounded-lg">
              <Bot className="size-4.5" />
            </div>
            <div>
              <h3 className="text-xs font-bold leading-tight uppercase tracking-wide">{agent.name}</h3>
              <p className="text-[10px] text-muted-foreground font-mono">{agent.role}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all focus-within:opacity-100">
            <button
              onClick={onEdit}
              className="border border-border/40 rounded p-1.5 text-muted-foreground hover:bg-muted transition-all"
              aria-label="Edit agent instructions"
            >
              <Edit2 className="size-3" />
            </button>
            {isSystem && agent.hasOverride && onReset && (
              <button
                onClick={onReset}
                className="border border-border/40 rounded p-1.5 text-amber-500 hover:bg-amber-500/10 transition-all"
                title="Reset to default prompt template"
                aria-label="Reset to default prompt"
              >
                <RotateCcw className="size-3" />
              </button>
            )}
            {!isSystem && onDelete && agent.isOwner && (
              <button
                onClick={onDelete}
                className="border border-border/40 rounded p-1.5 text-muted-foreground hover:border-destructive/30 hover:bg-destructive/15 hover:text-destructive transition-all"
                aria-label="Delete custom agent"
              >
                <Trash2 className="size-3" />
              </button>
            )}
          </div>
        </div>

        <p className="line-clamp-4 text-[11px] leading-relaxed text-muted-foreground font-mono bg-muted/10 p-2 border border-border/30 rounded-md">
          {agent.prompt}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[9px]">
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 border border-border/70 bg-muted/65 rounded-full px-2 py-0.5 font-mono font-bold">
            {providerLabel}
          </span>
          {agent.model && (
            <span className="inline-flex items-center gap-1 border border-border/70 bg-muted/65 rounded-full px-2 py-0.5 font-mono font-bold">
              {agent.model}
            </span>
          )}
        </div>
        
        {isSystem ? (
          agent.hasOverride ? (
            <span className="inline-flex items-center gap-1 border border-amber-500/30 bg-amber-500/10 rounded-full px-2 py-0.5 font-bold text-amber-500">
              Customized
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 border border-border/80 bg-muted/40 rounded-full px-2 py-0.5 font-bold text-muted-foreground">
              Default Template
            </span>
          )
        ) : (
          agent.isPublic && (
            <span className="inline-flex items-center gap-1 border border-primary/30 bg-primary/10 rounded-full px-2 py-0.5 font-bold text-primary">
              <Globe className="size-2" /> Public
            </span>
          )
        )}
      </div>
    </Card>
  )
}
