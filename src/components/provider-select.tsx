'use client'

/**
 * ProviderSelect — a reusable AI-provider picker.
 *
 * Fetches the merged provider list from /api/providers (built-in providers
 * + platform/own-key status + the user's own custom providers) and renders
 * a <Select>. Providers with no usable key (no platform key AND no personal
 * key) are shown but disabled, with a hint to add one in Settings.
 */

import * as React from 'react'
import Link from 'next/link'
import { KeyRound, Sparkles } from 'lucide-react'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel,
} from '@/components/ui/select'

export interface ProviderOption {
  id: string
  label: string
  isCustom: boolean
  hasPlatformKey: boolean
  hasOwnKey: boolean
  usable: boolean
  defaultModel?: string
}

interface ProviderSelectProps {
  value: string | null
  onChange: (v: string | null) => void
  /** Show the "Automatic (recommended)" option that lets the pipeline pick. */
  allowAuto?: boolean
  className?: string
}

export function useProviderOptions() {
  const [providers, setProviders] = React.useState<ProviderOption[]>([])
  const [loading, setLoading] = React.useState(true)

  const reload = React.useCallback(() => {
    setLoading(true)
    fetch('/api/providers')
      .then((r) => (r.ok ? r.json() : { providers: [] }))
      .then((d) => setProviders(d.providers || []))
      .catch(() => setProviders([]))
      .finally(() => setLoading(false))
  }, [])

  React.useEffect(() => { reload() }, [reload])

  return { providers, loading, reload }
}

export function ProviderSelect({ value, onChange, allowAuto = true, className }: ProviderSelectProps) {
  const { providers, loading } = useProviderOptions()
  const builtIn = providers.filter((p) => !p.isCustom)
  const custom = providers.filter((p) => p.isCustom)

  return (
    <Select
      value={value ?? '__auto__'}
      onValueChange={(v) => onChange(v === '__auto__' ? null : v)}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={loading ? 'Loading providers…' : 'Choose a provider'} />
      </SelectTrigger>
      <SelectContent>
        {allowAuto && (
          <SelectItem value="__auto__">
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-accent" />
              Automatic (recommended)
            </span>
          </SelectItem>
        )}
        <SelectGroup>
          <SelectLabel>Built-in providers</SelectLabel>
          {builtIn.map((p) => (
            <SelectItem key={p.id} value={p.id} disabled={!p.usable}>
              <span className="flex items-center gap-1.5">
                {p.label}
                {p.hasOwnKey && (
                  <KeyRound className="size-3 text-accent" aria-label="Using your own key" />
                )}
                {!p.usable && <span className="text-muted-foreground">(no key yet)</span>}
              </span>
            </SelectItem>
          ))}
        </SelectGroup>
        {custom.length > 0 && (
          <SelectGroup>
            <SelectLabel>Your custom providers</SelectLabel>
            {custom.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                <span className="flex items-center gap-1.5">
                  <KeyRound className="size-3 text-accent" />
                  {p.label}
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        )}
        <div className="border-t border-border/60 p-1">
          <Link
            href="/app/settings/api-keys"
            className="flex items-center gap-1.5 rounded-sm px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent/10 hover:text-accent"
          >
            + Add your own API key or provider
          </Link>
        </div>
      </SelectContent>
    </Select>
  )
}
