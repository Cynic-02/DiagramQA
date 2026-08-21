'use client'

import * as React from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Trash2, Loader2, Save, ShieldCheck, Pencil, X, FlaskConical,
} from 'lucide-react'
import { toast } from 'sonner'
import { PageFrame, Ledger, SectionRule } from '@/components/layout/PageFrame'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
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
  const [showGuide, setShowGuide] = React.useState(false)

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

  const withOwnKey = providers.filter((p) => p.hasOwnKey).length
  const visionReady = providers.filter((p) => p.usable && p.supportsVision).length

  return (
    <PageFrame
      eyebrow="API keys"
      title="API keys"
      lede="One vision-capable key runs the whole pipeline — the console picks the provider and model for you. Keys are only ever used for runs and chats you start."
      ledger={
        <Ledger
          cells={[
            { k: 'Providers', v: providers.length },
            { k: 'Your keys', v: withOwnKey },
            { k: 'Vision ready', v: visionReady },
            { k: 'Custom', v: custom.length },
          ]}
        />
      }
      actions={
        <Button
          variant={showGuide ? 'default' : 'outline'}
          onClick={() => setShowGuide((v) => !v)}
        >
          <ShieldCheck className="size-4" />
          Setup guide
        </Button>
      }
      status={
        <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--ink-2)]">
          {visionReady > 0
            ? `${visionReady} vision-capable host${visionReady === 1 ? '' : 's'} ready`
            : 'No vision-capable host — the sample demo still runs without one'}
        </span>
      }
    >
      <>
        {/* Setup guide — collapsed by default. It is reference material, not
            something you read every visit, so it no longer occupies the top
            third of the page permanently. */}
        <AnimatePresence initial={false}>
          {showGuide && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="mb-5 border-[3px] border-[var(--line)] bg-[var(--card)] shadow-[5px_5px_0_var(--line)]">
                <div className="flex items-center gap-2 border-b-[3px] border-[var(--line)] bg-[var(--ink)] px-4 py-2.5">
                  <ShieldCheck className="size-4 text-[var(--paper)]" />
                  <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--paper)]">
                    Setup guide
                  </h2>
                </div>
                <div className="grid gap-0 md:grid-cols-2 xl:grid-cols-4">
                  {[
                    {
                      n: '01',
                      t: 'How many keys?',
                      body: (
                        <>
                          <strong className="text-[var(--ink)]">One.</strong> A key for OpenAI,
                          Anthropic, Gemini, GLM, Qwen or OpenRouter reads the diagram image, so
                          every agent runs on it automatically. Paste several keys for the same
                          provider — one per line — and the pipeline rotates when one hits its
                          rate limit.
                        </>
                      ),
                    },
                    {
                      n: '02',
                      t: 'Where to get one',
                      body: (
                        <>
                          <a
                            href="https://platform.openai.com/api-keys"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-[var(--red)] underline underline-offset-2"
                          >
                            OpenAI
                          </a>
                          ,{' '}
                          <a
                            href="https://console.anthropic.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-[var(--red)] underline underline-offset-2"
                          >
                            Anthropic
                          </a>{' '}
                          or{' '}
                          <a
                            href="https://aistudio.google.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-[var(--red)] underline underline-offset-2"
                          >
                            Google AI Studio
                          </a>
                          . Groq and Kimi handle text but cannot read images, so they need one of
                          the above alongside them.
                        </>
                      ),
                    },
                    {
                      n: '03',
                      t: 'Add and verify',
                      body: (
                        <>
                          Find the provider below, hit{' '}
                          <strong className="text-[var(--ink)]">Add your key</strong>, paste the
                          token, save. Leave the model field blank for the default, and use{' '}
                          <strong className="text-[var(--ink)]">Test</strong> to confirm the
                          connection.
                        </>
                      ),
                    },
                    {
                      n: '04',
                      t: 'Run it',
                      body: (
                        <>
                          Back to the{' '}
                          <Link
                            href="/app"
                            className="font-bold text-[var(--red)] underline underline-offset-2"
                          >
                            console
                          </Link>
                          , drop a diagram, run the pipeline. No provider or model choice needed.
                        </>
                      ),
                    },
                  ].map((c, i) => (
                    <div
                      key={c.n}
                      className={cn(
                        'border-[var(--line)] p-4',
                        i > 0 && 'border-t-2 md:border-t-0',
                        i % 2 === 1 && 'md:border-l-2',
                        i >= 2 && 'md:border-t-2 xl:border-t-0',
                        'xl:[&:not(:first-child)]:border-l-2',
                      )}
                    >
                      <div className="mb-2 flex items-baseline gap-2">
                        <span className="dat text-[11px] font-bold text-[var(--red)]">{c.n}</span>
                        <h3 className="font-[family-name:var(--font-archivo)] text-[12px] font-black uppercase tracking-[0.04em]">
                          {c.t}
                        </h3>
                      </div>
                      <p className="text-[11px] leading-relaxed text-[var(--ink-2)]">{c.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="size-5 animate-spin text-[var(--ink-2)]" />
          </div>
        ) : (
          <div className="space-y-7">
            {/* ---- Built-in providers ---- */}
            <section>
              <SectionRule
                right={
                  <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--ink-2)]">
                    your key overrides the platform key
                  </span>
                }
              >
                Built-in providers
              </SectionRule>
              <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {builtIn.map((p) => (
                  <BuiltInProviderCard key={p.id} provider={p} onSaved={load} />
                ))}
              </div>
            </section>

            {/* ---- Custom providers ---- */}
            <section>
              <SectionRule
                right={
                  <Button size="xs" onClick={() => setShowCustomForm((v) => !v)}>
                    <Plus className="size-3" />
                    {showCustomForm ? 'Cancel' : 'Add endpoint'}
                  </Button>
                }
              >
                Your custom providers
              </SectionRule>
              <p className="mb-2.5 max-w-3xl text-[11px] leading-relaxed text-[var(--ink-2)]">
                Any OpenAI-compatible endpoint — a self-hosted model, a proxy, a provider not
                listed above — under whatever name you like. Only you can see or select it.
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
                <div className="flex flex-col items-center justify-center gap-2 border-[3px] border-dashed border-[var(--line)]/50 bg-[var(--card)] px-6 py-8 text-center">
                  <p className="text-[11px] leading-relaxed text-[var(--ink-2)]">
                    No custom endpoints yet.
                  </p>
                </div>
              ) : (
                <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {custom.map((p) => (
                    <CustomProviderCard key={p.id} provider={p} onSaved={load} onDeleted={load} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </>
    </PageFrame>
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
    <article className="flex min-w-0 flex-col border-[3px] border-[var(--line)] bg-[var(--card)] p-3 sm:-mr-[3px] sm:-mb-[3px]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[12px] font-bold uppercase leading-tight tracking-[0.02em]">
            {provider.label}
          </p>
          <p className="mt-0.5 truncate font-mono text-[9px] text-[var(--ink-2)]">
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
    </article>
  )
}

function StatusChip({ provider }: { provider: ProviderRow }) {
  if (provider.hasOwnKey) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 border-2 border-[var(--line)] bg-[var(--ink)] px-1.5 py-[2px] font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--paper)]">
        <ShieldCheck className="size-2.5" /> yours
      </span>
    )
  }
  if (provider.hasPlatformKey) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 border-2 border-[var(--line)] bg-[var(--muted)] px-1.5 py-[2px] font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--ink-2)]">
        platform
      </span>
    )
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 border-2 border-dashed border-[var(--line)]/50 px-1.5 py-[2px] font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--ink-2)]">
      no key
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
      <div className="mb-4 border-[3px] border-[var(--line)] bg-[var(--card)] shadow-[5px_5px_0_var(--line)]">
        <div className="border-b-[3px] border-[var(--line)] bg-[var(--ink)] px-4 py-2.5">
          <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--paper)]">
            New OpenAI-compatible endpoint
          </h3>
        </div>
        <form onSubmit={submit} className="space-y-3 p-4">
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
      </div>
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
    <article
      className={cn(
        'flex min-w-0 flex-col border-[3px] border-[var(--line)] bg-[var(--card)] p-3 sm:-mr-[3px] sm:-mb-[3px]',
        editing && 'sm:col-span-2',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[12px] font-bold uppercase leading-tight tracking-[0.02em]">
            {provider.label}
          </p>
          <p className="mt-0.5 truncate font-mono text-[9px] text-[var(--ink-2)]" title={provider.baseURL}>
            {provider.baseURL}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 border-2 border-[var(--line)] bg-[var(--ink)] px-1.5 py-[2px] font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--paper)]">
          <ShieldCheck className="size-2.5" /> yours
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
    </article>
  )
}
