'use client'

import * as React from 'react'
import { AnimatePresence } from 'framer-motion'
import {
  Bot, Plus, Trash2, Loader2, Save, Globe, Lock, Brain, Edit2, RotateCcw, AlertTriangle
} from 'lucide-react'
import { toast } from 'sonner'
import { PageFrame, Ledger } from '@/components/layout/PageFrame'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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

  const customised = systemAgents.filter((a) => a.hasOverride).length

  return (
    <PageFrame
      eyebrow="Agents"
      title="Agent & prompt editor"
      lede="Rewrite the system instructions the four pipeline agents run on, or build your own. Changes are saved to your account and apply to every future run."
      ledger={
        <Ledger
          cells={[
            { k: 'Core', v: systemAgents.length },
            { k: 'Custom', v: customAgents.length },
            { k: 'Overridden', v: customised },
            { k: 'Hosts', v: providerOptions.length },
          ]}
        />
      }
      actions={
        <Button
          onClick={() => {
            setEditingAgent(null)
            setShowForm((v) => !v)
          }}
          className="shrink-0"
        >
          <Plus className="size-4" />
          {showForm ? 'Cancel' : 'New agent'}
        </Button>
      }
      status={
        <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--ink-2)]">
          {systemAgents.length} core · {customAgents.length} custom ·{' '}
          {customised > 0 ? `${customised} overridden` : 'all defaults'}
        </span>
      }
    >
      <div className="mx-auto w-full max-w-[1440px] pb-6">
        {/* Create form */}
        <AnimatePresence>
          {showForm && (
            <AgentForm
              providerOptions={providerOptions}
              onClose={() => setShowForm(false)}
              onCreated={() => {
                setShowForm(false)
                load()
              }}
            />
          )}
        </AnimatePresence>

        {/* Edit form */}
        <AnimatePresence>
          {editingAgent && (
            <AgentForm
              providerOptions={providerOptions}
              agentToEdit={editingAgent}
              onClose={() => setEditingAgent(null)}
              onCreated={() => {
                setEditingAgent(null)
                load()
              }}
            />
          )}
        </AnimatePresence>

        {loading && customAgents.length === 0 && systemAgents.length === 0 ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="size-5 animate-spin text-[var(--ink-2)]" />
          </div>
        ) : (
          <div className="space-y-9">
            {/* ---------------- 01 · CORE PIPELINE ---------------- */}
            <section>
              <NumberedRule
                n="01"
                title="Core pipeline agents"
                meta="vision · generate · solve · critique"
              >
                The four system prompts a run actually executes, in order. Editing one
                changes every future run on this account — the originals are always one
                click away.
              </NumberedRule>
              {/* Real gaps. The old grid welded the four cards edge to
                  edge with negative margins, which is honest brutalism
                  and unreadable in practice: four dense prompt bodies
                  separated by nothing but a shared black rule is a wall
                  of text, not four objects. */}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {systemAgents.map((agent, i) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    accent={`var(--bloom-${(i % 6) + 1})`}
                    providerOptions={providerOptions}
                    onEdit={() => { setShowForm(false); setEditingAgent(agent) }}
                    onReset={() => handleResetSystem(agent.id)}
                  />
                ))}
              </div>
            </section>

            {/* ---------------- 02 · CUSTOM ---------------- */}
            <section>
              <NumberedRule n="02" title="Your custom agents" meta={`${customAgents.length} saved`}>
                Specialised agents with their own instructions and model host, for a task
                the four core agents were not written for.
              </NumberedRule>
              {customAgents.length === 0 ? (
                /* A compact prompt, not a canyon. The old empty state was
                   a `flex-1` dashed box, so on an account with no custom
                   agents it inflated to fill every pixel below the fold —
                   the emptiest thing on the page rendered as the largest.
                   It is now sized to its own content and offers the one
                   action it is asking for. */
                <div className="ticket mx-auto flex max-w-[560px] flex-col items-center gap-3 px-8 py-7 text-center">
                  <span className="flex size-11 items-center justify-center rounded-[var(--r-s)] border-2 border-[var(--line)] bg-[var(--yellow)] text-[#0a0a0a]">
                    <Bot className="size-5" strokeWidth={2.5} />
                  </span>
                  <div className="space-y-1">
                    <p className="font-[family-name:var(--font-archivo)] text-[15px] font-black uppercase tracking-[-0.01em]">
                      No custom agents yet
                    </p>
                    <p className="mx-auto max-w-[46ch] text-[11.5px] leading-relaxed text-[var(--ink-2)]">
                      Build one with its own instructions and model host — a marker for a
                      specific rubric, say, or a reader tuned to circuit diagrams.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingAgent(null)
                      setShowForm(true)
                    }}
                    className="mt-1"
                  >
                    <Plus className="size-3.5" />
                    Build an agent
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {customAgents.map((agent, i) => (
                    <AgentCard
                      key={agent.id}
                      agent={agent}
                      accent={`var(--bloom-${(i % 6) + 1})`}
                      providerOptions={providerOptions}
                      onEdit={() => { setShowForm(false); setEditingAgent(agent) }}
                      onDelete={() => handleDelete(agent.id)}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </PageFrame>
  )
}

/* ------------------------------------------------------------------ */
/* A numbered section rule.                                            */
/*                                                                     */
/* The numeral is outlined rather than filled. It has to be big enough */
/* to act as a wayfinding mark down the left edge of a long page, and  */
/* a solid 900-weight "01" at that size outweighs the heading it is    */
/* supposed to be introducing. Hollow keeps the size and gives back    */
/* the weight.                                                         */
/* ------------------------------------------------------------------ */
function NumberedRule({
  n,
  title,
  meta,
  children,
}: {
  n: string
  title: string
  meta?: string
  children?: React.ReactNode
}) {
  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span
          className="font-[family-name:var(--font-archivo)] text-[30px] font-black leading-none text-transparent"
          style={{ WebkitTextStroke: '2px var(--ink)', paintOrder: 'stroke fill' }}
          aria-hidden
        >
          {n}
        </span>
        <h2 className="font-[family-name:var(--font-archivo)] text-[17px] font-black uppercase leading-none tracking-[-0.01em]">
          {title}
        </h2>
        <span className="h-[2px] min-w-[24px] flex-1 rounded-none bg-[var(--line)]/18" aria-hidden />
        {meta && (
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--ink-2)]">
            {meta}
          </span>
        )}
      </div>
      {children && (
        <p className="mt-2 max-w-[76ch] text-[11.5px] leading-relaxed text-[var(--ink-2)]">
          {children}
        </p>
      )}
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

  /* The editor is a sheet laid on top of the list, not another panel
     welded into it: it gets the accent spine, a clipped corner so the
     filled header cannot square off the card, and a footer that is
     visibly the end of the sheet. */
  return (
    <div className="glass-surface mb-6 overflow-hidden border-2 border-[var(--line)] shadow-[6px_6px_0_var(--line)] [border-radius:var(--r-l)]">
      <div className="h-[5px] rounded-none bg-[var(--red)]" aria-hidden />
      <div className="flex items-center gap-2.5 border-b-2 border-[var(--line)]/20 px-5 py-3">
        <span className="flex size-7 items-center justify-center rounded-[var(--r-xs)] border-[1.5px] border-[var(--line)] bg-[var(--yellow)] text-[#0a0a0a]">
          <Brain className="size-3.5" strokeWidth={2.5} />
        </span>
        <h3 className="font-[family-name:var(--font-archivo)] text-[13px] font-black uppercase tracking-[0.03em]">
          {isEditing
            ? `Edit ${isSystem ? 'system instructions' : 'custom agent'}`
            : 'Create a custom agent'}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--ink-2)] hover:text-[var(--red)]"
        >
          Close
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5 p-5">

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="fig-label">Agent Name</Label>
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
            <Label className="fig-label">Role / Identifier</Label>
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
          <Label className="fig-label">System Instructions (Prompt Template)</Label>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Write details of how this agent should act..."
            className="min-h-[180px] resize-y text-xs font-mono leading-relaxed"
            required
          />
          {isSystem && (
            <p className="flex items-start gap-2 rounded-[var(--r-s)] border-[1.5px] border-[var(--yellow)] bg-[color-mix(in_srgb,var(--yellow)_14%,transparent)] px-3 py-2 text-[11px] leading-relaxed">
              <AlertTriangle className="mt-[2px] size-3.5 shrink-0" strokeWidth={2.5} />
              <span>
                Keep the templated parameters intact — <span className="chip-code">{"{{STRUCTURE}}"}</span>{' '}
                <span className="chip-code">{"{{QUESTIONS}}"}</span> and the rest are substituted at
                run time. <span className="mark">Delete one and the run cannot compile.</span>
              </span>
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="fig-label">AI Provider</Label>
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
            <Label className="fig-label">Model Override (Optional)</Label>
            <Input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={PROVIDER_LIST.find((p) => p.id === provider)?.model || ''}
              className="h-10 text-xs"
            />
          </div>
        </div>

        {!isSystem && (
          <div className="flex items-center justify-between gap-4 rounded-[var(--r-s)] border-[1.5px] border-[var(--line)]/30 bg-[var(--paper)] px-4 py-3">
            <div className="flex items-center gap-2.5">
              {isPublic ? (
                <Globe className="size-4 text-[var(--red)]" />
              ) : (
                <Lock className="size-4 text-[var(--ink-2)]" />
              )}
              <div>
                <p className="text-xs font-bold">Share publicly</p>
                <p className="text-[10.5px] text-[var(--ink-2)]">
                  Allow other accounts to use this agent
                </p>
              </div>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
        )}

        <div className="-mx-5 -mb-5 mt-1 flex items-center justify-end gap-2 border-t-2 border-[var(--line)]/20 bg-[var(--paper)] px-5 py-3">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            Save instructions
          </Button>
        </div>
      </form>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function AgentCard({
  agent,
  providerOptions,
  accent = 'var(--line)',
  onEdit,
  onDelete,
  onReset,
}: {
  agent: Agent
  providerOptions: ProviderOption[]
  /** A Bloom hue, used only as a 3px spine down the card's left edge. */
  accent?: string
  onEdit: () => void
  onDelete?: () => void
  onReset?: () => void
}) {
  const providerLabel =
    PROVIDER_LIST.find((p) => p.id === agent.provider)?.label
    || providerOptions.find((p) => p.id === agent.provider)?.label
    || agent.provider

  const isSystem = agent.isSystem === true

  /* One card per agent, standing on its own. The colour spine is the
     only saturated ink on it: it tells four otherwise identical dense
     cards apart at a glance, which is what the shared-border grid was
     failing to do. Hover LIFTS — a card is an object to pick up, not a
     button to push in. */
  return (
    <article className="lift glass-surface group flex min-w-0 flex-col overflow-hidden border-2 border-[var(--line)] shadow-[4px_4px_0_var(--line)]">
      <div className="h-[5px] shrink-0 rounded-none" style={{ background: accent }} aria-hidden />

      <header className="flex items-start gap-2.5 px-3.5 pb-2 pt-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-[var(--r-xs)] border-[1.5px] border-[var(--line)] bg-[var(--paper)]">
          <Bot className="size-3.5" strokeWidth={2.5} />
        </span>
        <div className="min-w-0 flex-1">
          <h3
            className="truncate font-[family-name:var(--font-archivo)] text-[12.5px] font-black uppercase leading-tight tracking-[0.01em]"
            title={agent.name}
          >
            {agent.name}
          </h3>
          <p
            className="truncate font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--ink-2)]"
            title={agent.role}
          >
            {agent.role}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <IconBtn onClick={onEdit} label="Edit instructions">
            <Edit2 className="size-3" />
          </IconBtn>
          {isSystem && agent.hasOverride && onReset && (
            <IconBtn onClick={onReset} label="Reset to default prompt" tone="warn">
              <RotateCcw className="size-3" />
            </IconBtn>
          )}
          {!isSystem && onDelete && agent.isOwner && (
            <IconBtn onClick={onDelete} label="Delete agent" tone="danger">
              <Trash2 className="size-3" />
            </IconBtn>
          )}
        </div>
      </header>

      {/* The prompt body, set on the paper ground rather than the card
          ground so it reads as quoted source rather than as copy. */}
      <div className="mx-3.5 mb-3 min-h-[92px] flex-1 rounded-[var(--r-s)] border-[1.5px] border-[var(--line)]/25 bg-[color-mix(in_srgb,var(--paper)_55%,transparent)] px-2.5 py-2">
        <p className="line-clamp-5 font-mono text-[10px] leading-relaxed text-[var(--ink-2)]">
          {agent.prompt}
        </p>
      </div>

      <footer className="flex flex-wrap items-center gap-1.5 border-t-2 border-[var(--line)]/15 px-3.5 py-2">
        <span className="max-w-full truncate rounded-[var(--r-xs)] border-[1.5px] border-[var(--line)]/45 px-1.5 py-[2px] font-mono text-[9px] font-bold uppercase tracking-[0.1em]">
          {providerLabel}
        </span>
        {agent.model && (
          <span className="max-w-full truncate font-mono text-[9px] text-[var(--ink-2)]" title={agent.model}>
            {agent.model}
          </span>
        )}
        <span className="ml-auto shrink-0">
          {isSystem ? (
            agent.hasOverride ? (
              <span className="rounded-[var(--r-xs)] border-[1.5px] border-[var(--line)] bg-[var(--yellow)] px-1.5 py-[2px] font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[#0a0a0a]">
                Overridden
              </span>
            ) : (
              <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--ink-2)]">
                default
              </span>
            )
          ) : (
            agent.isPublic && (
              <span className="inline-flex items-center gap-1 rounded-[var(--r-xs)] border-[1.5px] border-[var(--line)] bg-[var(--ink)] px-1.5 py-[2px] font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--paper)]">
                <Globe className="size-2.5" /> public
              </span>
            )
          )}
        </span>
      </footer>
    </article>
  )
}

function IconBtn({
  onClick,
  label,
  children,
  tone = 'default',
}: {
  onClick: () => void
  label: string
  children: React.ReactNode
  tone?: 'default' | 'warn' | 'danger'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex size-6 items-center justify-center rounded-[var(--r-xs)] border-[1.5px] border-[var(--line)] bg-[var(--card)] text-[var(--ink-2)]',
        'transition-colors duration-[90ms]',
        tone === 'danger'
          ? 'hover:bg-[var(--red)] hover:text-white'
          : tone === 'warn'
          ? 'hover:bg-[var(--yellow)] hover:text-[#0a0a0a]'
          : 'hover:bg-[var(--ink)] hover:text-[var(--paper)]',
      )}
    >
      {children}
    </button>
  )
}
