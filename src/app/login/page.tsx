'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'

import dynamic from 'next/dynamic'

import { cn } from '@/lib/utils'
import { Spectrum } from '@/components/landing/primitives'
import { ThemeToggle } from '@/components/theme-toggle'

/* The same graph as the landing page, held at its final formation —
   the collapse into the wordmark. The scroll journey ends here. */
const GraphEngine = dynamic(() => import('@/components/graph/GraphEngine'), { ssr: false })

/* ==================================================================
   THE ID CARD

   The old /login wrapped a stock form in a Heatmap shader, a
   DecryptedText scramble, a Lens magnifier and a shader logo, inside
   the most-copied layout on the internet: 50/50 split, form left,
   marketing right. Four unrelated effects and no idea, on the
   highest-intent page in the product.

   This is one object in an empty room. A faculty ID card, extruded,
   hard ink borders, a hard offset shadow on the floor. It tilts to the
   pointer (max 8°, damped). Sign in and Create account are the two
   faces of the same card, so switching is a physical flip. Submit is
   THE STAMP — education is marking, and marking is stamping.

   The form is real DOM inside a CSS 3D transform, not a texture, so it
   stays selectable, autofillable and screen-reader correct. No WebGL.
   ================================================================== */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Mode = 'signin' | 'signup'

export default function LoginPage() {
  const router = useRouter()

  const [mode, setMode] = React.useState<Mode>('signin')
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [googleLoading, setGoogleLoading] = React.useState(false)
  const [stamp, setStamp] = React.useState<'none' | 'ok' | 'no'>('none')

  const stageRef = React.useRef<HTMLDivElement | null>(null)
  const cardRef = React.useRef<HTMLDivElement | null>(null)
  const tilt = React.useRef({ x: 0, y: 0 })

  const flipped = mode === 'signup'

  /* ---- pointer tilt. Max 8° each way, damped, never snapping. ---- */
  React.useEffect(() => {
    const stage = stageRef.current
    const card = cardRef.current
    if (!stage || !card) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (!window.matchMedia('(pointer: fine)').matches) return

    let raf = 0
    const target = { x: 0, y: 0 }

    const apply = () => {
      raf = requestAnimationFrame(apply)
      tilt.current.x += (target.x - tilt.current.x) * 0.09
      tilt.current.y += (target.y - tilt.current.y) * 0.09
      card.style.transform = `rotateY(${(flipped ? 180 : 0) + tilt.current.y}deg) rotateX(${tilt.current.x}deg)`
    }

    const move = (e: PointerEvent) => {
      const r = stage.getBoundingClientRect()
      target.y = ((e.clientX - r.left) / r.width - 0.5) * 16
      target.x = -((e.clientY - r.top) / r.height - 0.5) * 16
    }
    const leave = () => {
      target.x = 0
      target.y = 0
    }

    stage.addEventListener('pointermove', move)
    stage.addEventListener('pointerleave', leave)
    raf = requestAnimationFrame(apply)
    return () => {
      cancelAnimationFrame(raf)
      stage.removeEventListener('pointermove', move)
      stage.removeEventListener('pointerleave', leave)
    }
  }, [flipped])

  function switchMode(next: Mode) {
    if (next === mode) return
    setMode(next)
    setError(null)
  }

  function fireStamp(kind: 'ok' | 'no') {
    setStamp(kind)
    window.setTimeout(() => setStamp('none'), 1700)
  }

  async function handleGoogle() {
    setGoogleLoading(true)
    try {
      await signIn('google', { callbackUrl: '/app' })
    } catch {
      setGoogleLoading(false)
      setError('Could not start Google sign-in. Please try again.')
      fireStamp('no')
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (email.includes('@') && !EMAIL_RE.test(email)) {
      setError('Please enter a valid email address.')
      return fireStamp('no')
    }
    if (!email.trim()) {
      setError('Please enter your email or username.')
      return fireStamp('no')
    }
    if (mode === 'signup' && !name.trim()) {
      setError('Please enter your name.')
      return fireStamp('no')
    }
    if (mode === 'signup' && password.length < 6) {
      setError('Password must be at least 6 characters.')
      return fireStamp('no')
    }
    if (!password) {
      setError('Please enter your password.')
      return fireStamp('no')
    }

    setLoading(true)
    try {
      const endpoint = mode === 'signup' ? '/api/auth/register' : '/api/auth/login'
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
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        setError(data?.error ?? 'Something went wrong. Please try again.')
        fireStamp('no')
        return
      }

      fireStamp('ok')

      const params = new URLSearchParams(window.location.search)
      const from = params.get('from')
      const dest = from && from.startsWith('/') && !from.startsWith('//') ? from : '/app'
      // let the stamp land before the route changes
      window.setTimeout(() => {
        router.push(dest)
        router.refresh()
      }, 620)
    } catch {
      setError('Network error. Please check your connection and try again.')
      fireStamp('no')
    } finally {
      setLoading(false)
    }
  }

  const field =
    'w-full border-2 border-[var(--ink)] bg-[var(--card)] px-3.5 py-3 font-mono text-sm ' +
    'transition-[border-width,box-shadow,padding] duration-[90ms] outline-none ' +
    'focus:border-[3px] focus:px-[13px] focus:py-[11px] focus:shadow-[4px_4px_0_var(--ink)] ' +
    'placeholder:text-[var(--ink-2)]'

  return (
    <main className="relative flex min-h-screen flex-col bg-[var(--background)]">
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.38]" aria-hidden>
        <GraphEngine className="h-full w-full" fixedBeat={3} />
      </div>

      {/* chrome */}
      <div className="relative z-10 flex items-center justify-between gap-4 border-b-2 border-[var(--ink)] px-6 py-3 sm:px-10">
        <Link href="/" className="lbl hover:text-[var(--red)]">
          ← DiagramMind
        </Link>
        <ThemeToggle />
      </div>

      {/* the empty room */}
      <div
        ref={stageRef}
        className="relative z-10 flex flex-1 items-center justify-center px-6 py-14"
        style={{ perspective: '1400px' }}
      >
        <div
          ref={cardRef}
          className="relative w-full max-w-[400px]"
          style={{
            transformStyle: 'preserve-3d',
            transform: `rotateY(${flipped ? 180 : 0}deg)`,
            transition: 'transform 600ms cubic-bezier(.16,1,.3,1)',
          }}
        >
          <Face
            hidden={flipped}
            title="SIGN IN"
            sub="Access your question sets."
            badge="ID · 2026"
            reverse={false}
          >
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              <ErrorNote error={error} />
              <label className="block">
                <span className="lbl mb-2 block">Email or username</span>
                <input
                  className={field}
                  type="text"
                  autoComplete="username"
                  placeholder="you@school.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="lbl mb-2 flex items-center justify-between gap-3">
                  Password
                  <Link
                    href="/forgot-password"
                    className="lbl normal-case tracking-normal text-[var(--ink-2)] hover:text-[var(--red)]"
                  >
                    forgot?
                  </Link>
                </span>
                <input
                  className={field}
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <Submit loading={loading}>Sign in →</Submit>
              <GoogleBtn onClick={handleGoogle} loading={googleLoading} />
              <FlipLink onClick={() => switchMode('signup')}>
                New here? Create account ↻
              </FlipLink>
            </form>
          </Face>

          <Face
            hidden={!flipped}
            title="CREATE"
            sub="Free. No card needed."
            badge="NEW · 2026"
            reverse
          >
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              <ErrorNote error={error} />
              <label className="block">
                <span className="lbl mb-2 block">Name</span>
                <input
                  className={field}
                  type="text"
                  autoComplete="name"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="lbl mb-2 block">Email</span>
                <input
                  className={field}
                  type="email"
                  autoComplete="email"
                  placeholder="you@school.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="lbl mb-2 block">Password</span>
                <input
                  className={field}
                  type="password"
                  autoComplete="new-password"
                  placeholder="min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <Submit loading={loading}>Create account →</Submit>
              <FlipLink onClick={() => switchMode('signin')}>
                Already have one? Sign in ↻
              </FlipLink>
            </form>
          </Face>
        </div>

        {/* THE STAMP */}
        <span
          className={cn('stamp', stamp !== 'none' && 'stamp-hit')}
          aria-hidden
          style={{ zIndex: 50 }}
        >
          {stamp === 'no' ? 'REJECTED' : 'APPROVED'}
        </span>
      </div>

      <p className="relative z-10 px-6 pb-8 text-center text-xs leading-relaxed text-[var(--ink-2)]">
        By continuing you agree to the Terms and acknowledge the Privacy Policy.
      </p>
    </main>
  )
}

/* ------------------------------------------------------------------ */

function Face({
  hidden,
  title,
  sub,
  badge,
  reverse,
  children,
}: {
  hidden: boolean
  title: string
  sub: string
  badge: string
  reverse: boolean
  children: React.ReactNode
}) {
  return (
    <div
      aria-hidden={hidden}
      className="border-[4px] border-[var(--ink)] bg-[var(--card)] shadow-[14px_14px_0_var(--ink)]"
      style={{
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        transform: reverse ? 'rotateY(180deg)' : undefined,
        position: reverse ? 'absolute' : 'relative',
        inset: reverse ? 0 : undefined,
      }}
    >
      <Spectrum className="h-3 border-x-0 border-t-0 border-b-[3px]" reverse={reverse} />
      <div className="flex items-center justify-between gap-3 border-b-2 border-[var(--ink)] px-4 py-2.5">
        <span className="lbl">DiagramMind</span>
        <span className="lbl text-[var(--ink-2)]">{badge}</span>
      </div>
      <div className="p-6">
        <h1 className="d-l" style={{ fontSize: '2.1rem' }}>
          {title}
        </h1>
        <p className="mb-6 mt-1.5 text-sm text-[var(--ink-2)]">{sub}</p>
        {children}
      </div>
    </div>
  )
}

function ErrorNote({ error }: { error: string | null }) {
  if (!error) return null
  return (
    <p
      role="alert"
      className="border-2 border-[var(--red)] bg-[var(--red)] px-3 py-2.5 text-sm font-semibold text-white"
    >
      {error}
    </p>
  )
}

function Submit({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="dat mt-1 w-full border-[3px] border-[var(--ink)] bg-[var(--red)] px-6 py-3.5 text-xs font-bold uppercase tracking-[0.12em] text-white shadow-[6px_6px_0_var(--ink)] transition-[transform,box-shadow] duration-[90ms] ease-[cubic-bezier(.2,0,0,1)] hover:translate-x-[6px] hover:translate-y-[6px] hover:shadow-none disabled:opacity-60"
    >
      {loading ? 'Working…' : children}
    </button>
  )
}

function GoogleBtn({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="dat w-full border-2 border-[var(--ink)] bg-[var(--card)] px-6 py-3 text-xs font-bold uppercase tracking-[0.12em] shadow-[4px_4px_0_var(--ink)] transition-[transform,box-shadow] duration-[90ms] ease-[cubic-bezier(.2,0,0,1)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none disabled:opacity-60"
    >
      {loading ? 'Redirecting…' : 'Continue with Google'}
    </button>
  )
}

function FlipLink({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="lbl w-full py-2 text-[var(--ink-2)] transition-colors duration-[90ms] hover:text-[var(--red)]"
    >
      {children}
    </button>
  )
}
