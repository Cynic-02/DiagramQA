'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { signIn } from 'next-auth/react'
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Loader2,
  Lock,
  Mail,
  User,
  type LucideIcon,
} from 'lucide-react'
import { ShaderLogo } from '@/components/shader-icons'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import DecryptedText from '@/components/reactbits/DecryptedText'

/* ------------------------------------------------------------------ */
/* Types & constants                                                  */
/* ------------------------------------------------------------------ */

type Mode = 'signin' | 'signup'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const EASE = [0.22, 1, 0.36, 1] as const

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function LoginPage() {
  const reduce = useReducedMotion()
  const router = useRouter()

  const [mode, setMode] = useState<Mode>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const passwordTooShort =
    mode === 'signup' && password.length > 0 && password.length < 6
  const emailInvalid = email.length > 0 && !EMAIL_RE.test(email)

  function switchMode(next: Mode) {
    if (next === mode) return
    setMode(next)
    setError(null)
  }

  async function handleGoogle() {
    setGoogleLoading(true)
    try {
      // `signIn` from next-auth/react POSTs the CSRF token to
      // /api/auth/signin/google and follows the OAuth redirect.
      // callbackUrl is where the user lands after a successful round-trip.
      await signIn('google', { callbackUrl: '/app' })
    } catch {
      setGoogleLoading(false)
      setError('Could not start Google sign-in. Please try again.')
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    // Client-side validation
    if (!EMAIL_RE.test(email)) {
      setError('Please enter a valid email address.')
      return
    }
    if (mode === 'signup' && !name.trim()) {
      setError('Please enter your name.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    try {
      const endpoint =
        mode === 'signup' ? '/api/auth/register' : '/api/auth/login'
      const body =
        mode === 'signup'
          ? { name: name.trim(), email: email.trim(), password }
          : { email: email.trim(), password }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null
        setError(data?.error ?? 'Something went wrong. Please try again.')
        return
      }

      // Honor ?from= redirect if it's a safe relative path; else /app.
      // router.refresh() forces the middleware/server components to
      // re-read the freshly-set session cookie, so a client-side push
      // is safe here without needing a full hard reload.
      const params = new URLSearchParams(window.location.search)
      const from = params.get('from')
      const dest =
        from && from.startsWith('/') && !from.startsWith('//') ? from : '/app'
      router.push(dest)
      router.refresh()
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen">
      {/* LEFT — dark visual panel (desktop only) */}
      <VisualPanel reduce={!!reduce} />

      {/* RIGHT — auth form */}
      <div className="relative z-10 flex w-full flex-col items-center justify-center px-6 py-12 sm:px-10 lg:w-1/2 lg:px-16">
        <div className="w-full max-w-md">
          {/* Mobile brand mark (desktop shows it on the left panel) */}
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <BrandMark />
          </div>

          {/* Mode toggle */}
          <ModeToggle mode={mode} onChange={switchMode} />

          {/* Heading */}
          <div className="mt-8">
            <h1 className="text-balance text-3xl font-black uppercase leading-[0.95] tracking-tight text-foreground sm:text-4xl">
              {mode === 'signin' ? (
                <>
                  Welcome <span className="text-secondary">back</span>.
                </>
              ) : (
                <>
                  Create your <span className="text-secondary">account</span>.
                </>
              )}
            </h1>
            <p className="mt-3 text-sm font-medium leading-relaxed text-muted-foreground">
              {mode === 'signin'
                ? 'Sign in to access your diagram-driven question pipeline.'
                : 'Spin up a sandbox and run your first multi-agent pipeline.'}
            </p>
          </div>

          {/* Social sign-in + divider */}
          <div className="mt-8">
            <GoogleButton loading={googleLoading} onClick={handleGoogle} />
            <Divider label="or continue with email" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            {/* Error alert */}
            <AnimatePresence initial={false}>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -6, height: 0 }}
                  transition={{ duration: 0.22, ease: EASE }}
                  className="overflow-hidden"
                >
                  <div
                    role="alert"
                    className="flex items-start gap-3 rounded-lg border border-destructive/35 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive shadow-sm"
                  >
                    <AlertCircle
                      className="mt-0.5 size-4 flex-shrink-0"
                      strokeWidth={2}
                    />
                    <span className="leading-relaxed">{error}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Field set (name field crossfades on mode switch) */}
            <div className="space-y-4">
              <AnimatePresence mode="wait" initial={false}>
                {mode === 'signup' && (
                  <motion.div
                    key="name-field"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.22, ease: EASE }}
                  >
                    <Field
                      id="name"
                      label="Name"
                      type="text"
                      placeholder="Ada Lovelace"
                      icon={User}
                      autoComplete="name"
                      value={name}
                      onChange={setName}
                      disabled={loading}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <Field
                id="email"
                label="Email"
                type="email"
                placeholder="you@example.com"
                icon={Mail}
                autoComplete="email"
                value={email}
                onChange={setEmail}
                disabled={loading}
                invalid={emailInvalid}
                hint={
                  emailInvalid ? 'Please enter a valid email address.' : undefined
                }
              />

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-foreground/85">
                    Password
                  </Label>
                  {mode === 'signin' && (
                    <Link
                      href="/forgot-password"
                      className="text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
                      tabIndex={0}
                    >
                      Forgot password?
                    </Link>
                  )}
                </div>
                <div className="relative">
                  <Lock
                    aria-hidden
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70"
                    strokeWidth={1.75}
                  />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete={
                      mode === 'signup' ? 'new-password' : 'current-password'
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    aria-invalid={passwordTooShort || undefined}
                    className="pl-9"
                  />
                </div>
                <AnimatePresence initial={false}>
                  {passwordTooShort && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.18, ease: EASE }}
                      className="text-xs text-destructive/90"
                    >
                      Password must be at least 6 characters.
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Submit */}
            <div className="pt-2">
              <PremiumSubmitButton loading={loading} mode={mode} />
            </div>
          </form>

          {/* Legal line */}
          <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground/80">
            By continuing you agree to our{' '}
            <span className="text-foreground/70">Terms</span> and acknowledge
            our <span className="text-foreground/70">Privacy Policy</span>.
          </p>

          {/* Back to home */}
          <div className="mt-8 flex justify-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" strokeWidth={2} />
              Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ================================================================== */
/* LEFT — Visual panel                                                 */
/* ================================================================== */

function VisualPanel({ reduce }: { reduce: boolean }) {
  return (
    <div className="relative hidden w-1/2 overflow-hidden border-r border-border/40 lg:flex">
      {/* Flat grid overlay */}
      <div
        className="grid-faint pointer-events-none absolute inset-0 opacity-40"
        aria-hidden
      />

      {/* Content */}
      <div className="relative z-10 flex w-full flex-col justify-between p-12 xl:p-16">
        {/* Brand mark */}
        <div className="flex items-center gap-2.5">
          <BrandMark />
        </div>

        {/* Tagline + animated graph */}
        <div className="max-w-md">
          <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-3.5 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-foreground shadow-sm">
            <span className="thinking-dot inline-flex h-2 w-2 rounded-full bg-foreground" />
            {reduce ? (
              'AR2-DDCQG · Multi-agent pipeline'
            ) : (
              <DecryptedText
                text="AR2-DDCQG · Multi-agent pipeline"
                animateOn="view"
                speed={35}
                maxIterations={14}
                sequential
                revealDirection="start"
                useOriginalCharsOnly
              />
            )}
          </span>

          <h2 className="mt-6 text-balance text-4xl font-black uppercase leading-[0.95] tracking-tight text-foreground xl:text-5xl">
            From diagram to{' '}
            <span className="text-secondary">verified question set</span>.
          </h2>

          <p className="mt-5 text-pretty text-base leading-relaxed text-muted-foreground">
            An agentic, retrieval-augmented pipeline that turns any diagram
            into a Bloom-conditioned, source-grounded question set —
            observable end to end.
          </p>

          {/* Animated graph motif */}
          <div className="mt-10">
            <GraphMotif reduce={reduce} />
          </div>
        </div>

        {/* Footer status line */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70">
          <span className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-foreground" />
            System online
          </span>
          <span className="text-foreground/20">·</span>
          <span>4 agents standby</span>
          <span className="text-foreground/20">·</span>
          <span>Local sandbox</span>
        </div>
      </div>
    </div>
  )
}

/* ================================================================== */
/* Brand mark                                                          */
/* ================================================================== */

function BrandMark() {
  return (
    <>
      <span className="flex size-9 items-center justify-center rounded-lg border border-primary/45 bg-primary/10 shadow-sm">
        <ShaderLogo size={18} />
      </span>
      <span className="font-mono text-base font-black uppercase tracking-[0.1em] text-foreground">
        AR2-DDCQG
      </span>
    </>
  )
}

/* ================================================================== */
/* Animated SVG graph motif                                            */
/* ================================================================== */

interface GraphNode {
  id: string
  x: number
  y: number
  label: string
  highlight: boolean
}

const NODES: GraphNode[] = [
  { id: 'n1', x: 30, y: 50, label: 'INPUT', highlight: true },
  { id: 'n2', x: 90, y: 28, label: 'EXTRACT', highlight: false },
  { id: 'n3', x: 90, y: 72, label: 'GRAPH', highlight: false },
  { id: 'n4', x: 150, y: 50, label: 'QA', highlight: true },
  { id: 'n5', x: 120, y: 100, label: '', highlight: false },
  { id: 'n6', x: 60, y: 100, label: '', highlight: false },
]

const EDGES: ReadonlyArray<readonly [string, string]> = [
  ['n1', 'n2'],
  ['n1', 'n3'],
  ['n2', 'n4'],
  ['n3', 'n4'],
  ['n3', 'n5'],
  ['n1', 'n6'],
  ['n5', 'n6'],
]

function nodeById(id: string): GraphNode {
  const n = NODES.find((x) => x.id === id)
  if (!n) throw new Error(`node ${id} not found`)
  return n
}

function GraphMotif({ reduce }: { reduce: boolean }) {
  return (
    <svg
      viewBox="0 0 180 120"
      className="h-auto w-full max-w-sm"
      role="img"
      aria-label="Diagram to graph transformation"
    >
      {/* Edges + traveling pulses */}
      {EDGES.map(([a, b], i) => {
        const na = nodeById(a)
        const nb = nodeById(b)
        const edgeColor =
          na.highlight && nb.highlight
            ? 'var(--secondary)'
            : 'var(--border)'
        const pulseColor =
          na.highlight && nb.highlight
            ? 'var(--secondary)'
            : 'var(--accent)'
        return (
          <g key={`e-${i}`}>
            <line
              x1={na.x}
              y1={na.y}
              x2={nb.x}
              y2={nb.y}
              stroke={edgeColor}
              strokeWidth={1}
            />
            {!reduce && (
              <motion.circle
                r={1.6}
                fill={pulseColor}
                initial={{ cx: na.x, cy: na.y, opacity: 0 }}
                animate={{
                  cx: [na.x, nb.x],
                  cy: [na.y, nb.y],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 2.6,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: i * 0.35,
                }}
              />
            )}
          </g>
        )
      })}

      {/* Nodes */}
      {NODES.map((n, i) => {
        const color = n.highlight ? 'var(--secondary)' : 'var(--primary)'
        return (
          <g key={n.id}>
            {/* Node */}
            <motion.circle
              cx={n.x}
              cy={n.y}
              r={n.highlight ? 4 : 3}
              fill={color}
              stroke="var(--border)"
              strokeWidth={0.6}
              initial={reduce ? false : { scale: 0.6, opacity: 0 }}
              animate={reduce ? undefined : { scale: 1, opacity: 1 }}
              transition={{
                duration: 0.5,
                delay: i * 0.08,
                ease: EASE,
              }}
              style={{ transformOrigin: `${n.x}px ${n.y}px` }}
            />
            {n.label && (
              <text
                x={n.x}
                y={n.y - 7}
                textAnchor="middle"
                className="fill-muted-foreground font-mono"
                style={{ fontSize: '4.5px', letterSpacing: '0.15em' }}
              >
                {n.label}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

/* ================================================================== */
/* Mode toggle (segmented control with sliding pill)                   */
/* ================================================================== */

function ModeToggle({
  mode,
  onChange,
}: {
  mode: Mode
  onChange: (m: Mode) => void
}) {
  return (
    <div
      role="tablist"
      aria-label="Authentication mode"
      className="relative flex w-full rounded-full border border-border bg-card p-1 shadow-sm"
    >
      {(['signin', 'signup'] as const).map((m) => {
        const active = mode === m
        return (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(m)}
            className="relative z-10 flex-1 rounded-full px-4 py-2 text-sm font-bold uppercase tracking-wide transition-colors"
            style={{
              color: active
                ? 'var(--primary-foreground)'
                : 'var(--muted-foreground)',
            }}
          >
            {active && (
              <motion.span
                layoutId="auth-mode-pill"
                className="absolute inset-0 rounded-full border border-primary/20 bg-primary"
                transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              />
            )}
            {m === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        )
      })}
    </div>
  )
}

/* ================================================================== */
/* Field                                                               */
/* ================================================================== */

interface FieldProps {
  id: string
  label: string
  type: string
  placeholder: string
  icon: LucideIcon
  autoComplete: string
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  invalid?: boolean
  hint?: string
}

function Field({
  id,
  label,
  type,
  placeholder,
  icon: Icon,
  autoComplete,
  value,
  onChange,
  disabled,
  invalid,
  hint,
}: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-foreground/85">
        {label}
      </Label>
      <div className="relative">
        <Icon
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70"
          strokeWidth={1.75}
        />
        <Input
          id={id}
          name={id}
          type={type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          className="pl-9"
        />
      </div>
      <AnimatePresence initial={false}>
        {hint && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: EASE }}
            className="text-xs text-destructive/90"
          >
            {hint}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ================================================================== */
/* Premium submit button                                               */
/* ================================================================== */

function PremiumSubmitButton({
  loading,
  mode,
}: {
  loading: boolean
  mode: Mode
}) {
  return (
    <motion.button
      type="submit"
      disabled={loading}
      whileHover={loading ? undefined : { scale: 1.02 }}
      whileTap={loading ? undefined : { scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className="group relative flex h-12 w-full items-center justify-center gap-2 rounded-[var(--radius)] border border-border/80 bg-primary text-sm font-extrabold uppercase tracking-wide text-primary-foreground shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-75 hover:bg-primary/95"
    >
      <span className="relative flex items-center gap-2">
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" strokeWidth={2.25} />
            <span>
              {mode === 'signin' ? 'Signing in…' : 'Creating account…'}
            </span>
          </>
        ) : (
          <>
            <span>{mode === 'signin' ? 'Sign in' : 'Create account'}</span>
            <ArrowRight
              className="size-4 transition-transform duration-300 group-hover:translate-x-0.5"
              strokeWidth={2.25}
            />
          </>
        )}
      </span>
    </motion.button>
  )
}

/* ================================================================== */
/* Continue with Google button                                         */
/* ================================================================== */

function GoogleGLogo({ className }: { className?: string }) {
  // Official Google "G" multicolor SVG (https://developers.google.com/identity)
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      aria-hidden
      width="18"
      height="18"
    >
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  )
}

function GoogleButton({
  loading,
  onClick,
}: {
  loading: boolean
  onClick: () => void
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={loading}
      whileHover={loading ? undefined : { scale: 1.02 }}
      whileTap={loading ? undefined : { scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className="group relative flex h-11 w-full items-center justify-center gap-2.5 rounded-[var(--radius)] border border-border/80 bg-card text-sm font-bold text-foreground shadow-sm transition-all hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin text-muted-foreground" strokeWidth={2.25} />
      ) : (
        <GoogleGLogo className="size-[18px] shrink-0" />
      )}
      <span>Continue with Google</span>
    </motion.button>
  )
}

/* ================================================================== */
/* Divider with centered label                                         */
/* ================================================================== */

function Divider({ label }: { label: string }) {
  return (
    <div className="mt-5 flex items-center gap-3" aria-hidden>
      <span className="h-[2px] flex-1 bg-border" />
      <span className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <span className="h-[2px] flex-1 bg-border" />
    </div>
  )
}
