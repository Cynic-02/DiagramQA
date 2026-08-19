'use client'

import * as React from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  KeyRound, Plus, Trash2, Loader2, Save, ShieldCheck,
  ServerCog, Globe2, Pencil, X, FlaskConical,
} from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface ProviderRow {
  id: string
  keyId: string | null
  label: string
  defaultModel?: string
  baseURL?: string | null
  isCustom: boolean
  hasPlatformKey: boolean
  hasOwnKey: boolean
  usable: boolean
  ownModel?: string | null
}

export default function ApiKeysSettingsPage() {
  const [providers, setProviders] = React.useState<ProviderRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [showCustomForm, setShowCustomForm] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/providers')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setProviders(data.providers || [])
    } catch {
      toast.error('Failed to load providers')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { load() }, [load])

  const builtIn = providers.filter((p) => !p.isCustom)
  const custom = providers.filter((p) => p.isCustom)

  return (
    <div className="relative flex min-h-screen flex-col grid-faint-lighter">
      <PageHeader title="API Keys" />

      <div className="relative z-10 mx-auto w-full max-w-[1680px] flex-1 p-6 md:p-8">
        <div className="mb-6 space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center border border-primary/45 bg-primary/10 text-primary rounded-lg">
              <KeyRound className="size-5" />
            </div>
            <h1 className="text-2xl font-black tracking-tight md:text-[28px]">
              API <span className="text-secondary">Keys</span>
            </h1>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Bring your own API key for any provider, or connect a fully custom
            OpenAI-compatible endpoint under your own name. Your keys are only
            ever used for runs and chats you start — nobody else can see or
            use them.
          </p>
        </div>

        {/* Step-by-Step API Key Integration Guide */}
        <Card className="brutal-block mb-8 p-5 bg-primary/5 border-primary/20 space-y-4">
          <h2 className="text-sm font-bold flex items-center gap-2 text-primary">
            <ShieldCheck className="size-4" />
            Step-by-Step API Setup Guide
          </h2>
          
          <div className="grid gap-6 md:grid-cols-2 text-xs leading-relaxed text-foreground/80">
            <div className="space-y-3">
              <div>
                <p className="font-bold text-foreground">1. How many API keys are needed?</p>
                <p className="text-muted-foreground text-[11px] mt-0.5">
                  Just **ONE**. Add a key for OpenAI, Anthropic, Gemini, GLM, Qwen, or OpenRouter — every one of those can read the diagram image, so the whole pipeline (all agents) runs on that single key automatically. You never pick a provider or model yourself; the console does that for you.
                </p>
                <p className="text-muted-foreground text-[11px] mt-1">
                  Want more headroom? You can add **more than one key for the same provider** — paste each on its own line in the key field. If one hits its rate limit mid-run, the pipeline automatically rotates to the next one instead of failing.
                </p>
              </div>
              
              <div>
                <p className="font-bold text-foreground">2. Where to get your API keys?</p>
                <ul className="list-disc pl-4 mt-1 space-y-1 text-muted-foreground text-[11px]">
                  <li><a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">OpenAI API Keys Page</a> (for GPT-4o / GPT-4o-mini)</li>
                  <li><a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">Anthropic Console</a> (for Claude Sonnet)</li>
                  <li><a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">Google AI Studio Console</a> (for Gemini models)</li>
                </ul>
                <p className="text-muted-foreground text-[11px] mt-1">
                  Groq and Kimi keys work for text-only steps but can&apos;t read images, so on their own they can&apos;t run the diagram-extraction step — pair them with one of the providers above, or just use one of the above by itself.
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <p className="font-bold text-foreground">3. How to add and verify keys?</p>
                <p className="text-muted-foreground text-[11px] mt-0.5">
                  Locate your provider card below, click **"Add your key"**, paste your API token, and click **"Save"**. Leave the model field blank — we use a sensible default. You can click **"Test"** to immediately verify the connection works.
                </p>
              </div>
              
              <div>
                <p className="font-bold text-foreground">4. Running the pipeline smoothly</p>
                <p className="text-muted-foreground text-[11px] mt-0.5">
                  Once a key is saved, navigate back to the <Link href="/app" className="text-primary underline font-bold">Console</Link>, upload your diagram, and click **"Run pipeline"**. Every agent in the pipeline uses your saved key automatically — no provider or model selection needed.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-10">
            {/* ---- Built-in providers ---- */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <ServerCog className="size-4 text-primary" />
                <h2 className="text-sm font-bold">Built-in providers</h2>
              </div>
              <p className="text-xs text-muted-foreground">
                Add your own key to use a provider under your own account and
                quota. Without one, runs fall back to the platform&apos;s key
                (if configured) when you pick this provider.
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {builtIn.map((p) => (
                  <BuiltInProviderCard key={p.id} provider={p} onSaved={load} />
                ))}
              </div>
            </section>

            {/* ---- Custom providers ---- */}
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Globe2 className="size-4 text-primary" />
                  <h2 className="text-sm font-bold">Your custom providers</h2>
                </div>
                <Button size="sm" onClick={() => setShowCustomForm((v) => !v)} className="gap-1.5">
                  <Plus className="size-3.5" />
                  Add provider
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Connect any OpenAI-compatible endpoint (self-hosted models,
                a proxy, a provider not listed above) under whatever name you
                like. Only you can see or select it.
              </p>

              <AnimatePresence>
                {showCustomForm && (
                  <CustomProviderForm
                    onClose={() => setShowCustomForm(false)}
                    onCreated={() => { setShowCustomForm(false); load() }}
                  />
                )}
              </AnimatePresence>

              {custom.length === 0 ? (
                <Card className="brutal-block flex flex-col items-center justify-center gap-2 p-8 text-center">
                  <p className="text-xs text-muted-foreground">
                    No custom providers yet. Add one to use your own model /
                    endpoint under your own name.
                  </p>
                </Card>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {custom.map((p) => (
                    <CustomProviderCard key={p.id} provider={p} onSaved={load} onDeleted={load} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Built-in provider card + inline key form                            */
/* ------------------------------------------------------------------ */

function BuiltInProviderCard({
  provider,
  onSaved,
}: {
  provider: ProviderRow
  onSaved: () => void
}) {
  const [editing, setEditing] = React.useState(false)
  const [apiKey, setApiKey] = React.useState('')
  const [model, setModel] = React.useState(provider.ownModel || '')
  const [saving, setSaving] = React.useState(false)
  const [removing, setRemoving] = React.useState(false)
  const [testing, setTesting] = React.useState(false)

  const testConnection = async () => {
    if (!provider.keyId && !apiKey.trim()) {
      toast.error('Enter an API key to test')
      return
    }
    setTesting(true)
    try {
      const res = await fetch('/api/providers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          apiKey.trim()
            ? { providerId: provider.id, apiKey, model: model || undefined }
            : { keyId: provider.keyId }
        ),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Provider test failed')
      toast.success(`${provider.label} connection works`, {
        description: data.model ? `Model: ${data.model}` : undefined,
      })
    } catch (e) {
      toast.error(`${provider.label} test failed`, {
        description: e instanceof Error ? e.message : undefined,
      })
    } finally {
      setTesting(false)
    }
  }

  const save = async () => {
    if (!provider.keyId && !apiKey.trim()) {
      toast.error('Enter an API key')
      return
    }
    setSaving(true)
    try {
      let res: Response
      if (provider.keyId) {
        res = await fetch(`/api/providers/${provider.keyId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: model || null,
            ...(apiKey.trim() && { apiKey }),
          }),
        })
      } else {
        res = await fetch('/api/providers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ providerId: provider.id, apiKey, model: model || undefined }),
        })
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to save key')
      }
      toast.success(`${provider.label} key saved`)
      setApiKey('')
      setEditing(false)
      onSaved()
    } catch (e) {
      toast.error('Could not save key', { description: e instanceof Error ? e.message : undefined })
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!provider.keyId) return
    setRemoving(true)
    try {
      await fetch(`/api/providers/${provider.keyId}`, { method: 'DELETE' })
      toast.success(`${provider.label} — your key removed`)
      onSaved()
    } catch {
      toast.error('Could not remove key')
    } finally {
      setRemoving(false)
    }
  }

  return (
    <Card className="brutal-block p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold leading-tight">{provider.label}</p>
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
            {provider.defaultModel}
          </p>
        </div>
        <StatusChip provider={provider} />
      </div>

      {!editing ? (
        <div className="mt-3 flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => setEditing(true)}>
            <Pencil className="size-3" />
            {provider.hasOwnKey ? 'Update key' : 'Add your key'}
          </Button>
          {provider.hasOwnKey && (
            <>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 gap-1.5 text-xs"
                onClick={testConnection}
                disabled={testing}
              >
                {testing ? <Loader2 className="size-3 animate-spin" /> : <FlaskConical className="size-3" />}
                Test
              </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1.5 text-xs text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={remove}
              disabled={removing}
            >
              {removing ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
              Remove
            </Button>
            </>
          )}
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <Textarea
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={
              provider.hasOwnKey
                ? 'New key(s) — replaces the saved one(s). Add more than one, one per line, to auto-rotate when one hits its rate limit.'
                : 'API key. To add more than one for automatic rotation, put each on its own line.'
            }
            className="min-h-16 text-xs"
            autoComplete="off"
            spellCheck={false}
          />
          <p className="text-[10px] text-muted-foreground">
            Add multiple keys (one per line, or comma-separated) for the same provider — if one hits its rate limit mid-run, the pipeline automatically moves to the next.
          </p>
          <Input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder={`Model override — optional, leave blank (default: ${provider.defaultModel})`}
            className="h-9 text-xs"
          />
          <div className="flex items-center gap-2">
            <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
              Save
            </Button>
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={testConnection} disabled={testing || !apiKey.trim()}>
              {testing ? <Loader2 className="size-3 animate-spin" /> : <FlaskConical className="size-3" />}
              Test
            </Button>
            <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs" onClick={() => { setEditing(false); setApiKey('') }}>
              <X className="size-3" />
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}

function StatusChip({ provider }: { provider: ProviderRow }) {
  if (provider.hasOwnKey) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 border border-primary/30 bg-primary/10 rounded-full px-2 py-0.5 text-[10px] font-bold text-primary">
        <ShieldCheck className="size-2.5" /> Your key
      </span>
    )
  }
  if (provider.hasPlatformKey) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 border border-border/70 bg-muted/65 rounded-full px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
        Platform key
      </span>
    )
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 border border-border/70 bg-card rounded-full px-2 py-0.5 text-[10px] font-bold text-muted-foreground/60">
      No key
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Custom provider create form + card                                  */
/* ------------------------------------------------------------------ */

function CustomProviderForm({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const [label, setLabel] = React.useState('')
  const [baseURL, setBaseURL] = React.useState('')
  const [apiKey, setApiKey] = React.useState('')
  const [model, setModel] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [testing, setTesting] = React.useState(false)

  const testConnection = async () => {
    if (!label.trim() || !baseURL.trim() || !apiKey.trim()) {
      toast.error('Name, base URL and API key are required')
      return
    }
    setTesting(true)
    try {
      const res = await fetch('/api/providers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCustom: true, label, baseURL, apiKey, model: model || undefined }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Provider test failed')
      toast.success(`"${label}" connection works`, {
        description: data.model ? `Model: ${data.model}` : undefined,
      })
    } catch (e) {
      toast.error('Provider test failed', {
        description: e instanceof Error ? e.message : undefined,
      })
    } finally {
      setTesting(false)
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!label.trim() || !baseURL.trim() || !apiKey.trim()) {
      toast.error('Name, base URL and API key are required')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCustom: true, label, baseURL, apiKey, model: model || undefined }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to create provider')
      }
      toast.success(`"${label}" added`)
      onCreated()
    } catch (e) {
      toast.error('Could not add provider', { description: e instanceof Error ? e.message : undefined })
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden"
    >
      <Card className="brutal-block p-5">
        <form onSubmit={submit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Provider name</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. My local Llama" className="h-9" required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Default model</Label>
              <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. llama-3.1-70b" className="h-9" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Base URL (OpenAI-compatible /chat/completions)</Label>
            <Input value={baseURL} onChange={(e) => setBaseURL(e.target.value)} placeholder="https://your-endpoint.example.com/v1" className="h-9" required />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">API key</Label>
            <Textarea
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-… (add more than one, one per line, to auto-rotate when one hits its rate limit)"
              className="min-h-16 text-xs"
              autoComplete="off"
              spellCheck={false}
              required
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="button" variant="outline" size="sm" onClick={testConnection} disabled={testing} className="gap-1.5">
              {testing ? <Loader2 className="size-3.5 animate-spin" /> : <FlaskConical className="size-3.5" />}
              Test
            </Button>
            <Button type="submit" size="sm" disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              Add provider
            </Button>
          </div>
        </form>
      </Card>
    </motion.div>
  )
}

function CustomProviderCard({
  provider,
  onSaved,
  onDeleted,
}: {
  provider: ProviderRow
  onSaved: () => void
  onDeleted: () => void
}) {
  const [editing, setEditing] = React.useState(false)
  const [label, setLabel] = React.useState(provider.label)
  const [baseURL, setBaseURL] = React.useState(provider.baseURL || '')
  const [model, setModel] = React.useState(provider.defaultModel || '')
  const [apiKey, setApiKey] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [testing, setTesting] = React.useState(false)

  const testConnection = async () => {
    if (!provider.keyId && !apiKey.trim()) return
    setTesting(true)
    try {
      const res = await fetch('/api/providers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          apiKey.trim()
            ? { isCustom: true, label, baseURL, apiKey, model: model || undefined }
            : { keyId: provider.keyId }
        ),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Provider test failed')
      toast.success(`"${provider.label}" connection works`, {
        description: data.model ? `Model: ${data.model}` : undefined,
      })
    } catch (e) {
      toast.error('Provider test failed', {
        description: e instanceof Error ? e.message : undefined,
      })
    } finally {
      setTesting(false)
    }
  }

  const save = async () => {
    if (!provider.keyId) return
    setSaving(true)
    try {
      const res = await fetch(`/api/providers/${provider.keyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label,
          baseURL,
          model,
          ...(apiKey.trim() && { apiKey }),
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to update provider')
      }
      toast.success('Provider updated')
      setEditing(false)
      setApiKey('')
      onSaved()
    } catch (e) {
      toast.error('Could not update provider', { description: e instanceof Error ? e.message : undefined })
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!provider.keyId) return
    setDeleting(true)
    try {
      await fetch(`/api/providers/${provider.keyId}`, { method: 'DELETE' })
      toast.success(`"${provider.label}" removed`)
      onDeleted()
    } catch {
      toast.error('Could not remove provider')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Card className={cn('brutal-block p-4', editing && 'sm:col-span-2')}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold leading-tight">{provider.label}</p>
          <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
            {provider.baseURL}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 border border-primary/30 bg-primary/10 rounded-full px-2 py-0.5 text-[10px] font-bold text-primary">
          <ShieldCheck className="size-2.5" /> Your key
        </span>
      </div>

      {!editing ? (
        <div className="mt-3 flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => setEditing(true)}>
            <Pencil className="size-3" /> Edit
          </Button>
          <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-xs" onClick={testConnection} disabled={testing}>
            {testing ? <Loader2 className="size-3 animate-spin" /> : <FlaskConical className="size-3" />}
            Test
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 gap-1.5 text-xs text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={remove}
            disabled={deleting}
          >
            {deleting ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
            Delete
          </Button>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Provider name" className="h-9 text-xs" />
            <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Default model" className="h-9 text-xs" />
          </div>
          <Input value={baseURL} onChange={(e) => setBaseURL(e.target.value)} placeholder="Base URL" className="h-9 text-xs" />
          <Textarea
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="New key(s) — leave blank to keep current. Add more than one, one per line, to auto-rotate when one hits its rate limit."
            className="min-h-16 text-xs"
            autoComplete="off"
            spellCheck={false}
          />
          <div className="flex items-center gap-2">
            <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
              Save
            </Button>
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={testConnection} disabled={testing}>
              {testing ? <Loader2 className="size-3 animate-spin" /> : <FlaskConical className="size-3" />}
              Test
            </Button>
            <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs" onClick={() => setEditing(false)}>
              <X className="size-3" /> Cancel
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
