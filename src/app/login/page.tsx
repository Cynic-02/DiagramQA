'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { useTheme } from 'next-themes'

import type { PlateHandle } from '@/lib/plate/engine'

/* ==================================================================
   /login — THE PLATE

   Two panes.

   LEFT is a live plate. It is the same engine, the same eight
   diagrams and the same ink the homepage draws with — but pinned to
   one anchor and walked by a clock instead of a scroll, so the globe
   becomes the cell becomes the atom becomes the circuit while you
   type. That is the product's whole claim, running unattended: it
   does not care what the diagram is, only what its structure is.

   The plate answers the form, too. Focusing a field steps the drawing
   back so the fields carry the contrast; it is a backdrop that knows
   when it is not the subject.

   RIGHT is one card. Sign in on the front, create account on the back,
   and switching between them is a physical flip rather than a tab.

   The form is the real thing: same endpoints, same Google provider,
   same ?from= redirect as before. The drawing is decoration; the
   authentication is not.
   ================================================================== */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Mode = 'signin' | 'signup'

export default function LoginPage() {
  const router = useRouter()

  const stageRef = React.useRef<HTMLDivElement | null>(null)
  const plateRef = React.useRef<PlateHandle | null>(null)

  const [plate, setPlate] = React.useState('THE LENS')
  const [mode, setMode] = React.useState<Mode>('signin')
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [shake, setShake] = React.useState(0)
  const [loading, setLoading] = React.useState(false)
  const [googleLoading, setGoogleLoading] = React.useState(false)
  const [stamp, setStamp] = React.useState<{ kind: 'ok' | 'no'; seq: number } | null>(null)
  const [wipe, setWipe] = React.useState(false)

  const flipped = mode === 'signup'

  /* ---- the live plate ----
     autoplay walks the sequence on a clock; anchorX pins every plate to
     one spot so the morph happens in place; chips are off because the
     card column belongs to a page with room for it. */
  React.useEffect(() => {
    const host = stageRef.current
    if (!host) return
    let handle: PlateHandle | null = null
    let dead = false

    import('@/lib/plate/engine')
      .then(({ mountPlateStage }) => {
        if (dead || !stageRef.current) return
        handle = mountPlateStage(stageRef.current, {
          autoplay: 6,
          anchorX: 800,
          chips: false,
          /* Tighter than the homepage's. The sign-in stage is a
             half-width column, so the same viewBox that reads as
             full-bleed there rendered the plate at about two thirds
             the size it should be here. */
          viewBox: '390 76 830 748',
          preserveAspectRatio: 'xMidYMid meet',
          flight: 'premium',
          /* Sign-in gets its own three plates. Replaying the
             homepage's globe here made the two pages read as one
             page, and the globe is the most recognisable drawing
             in the product — the worst possible thing to repeat.
             Optics, structures, anatomy: same drafting rules,
             nothing in common with the marketing sequence. */
          only: ['LENS', 'TRUSS', 'HEART'],
          onScene: (_i, sceneName) => setPlate(sceneName),
        })
        plateRef.current = handle
      })
      .catch((err) => {
        // A backdrop is never worth a blank sign-in page.
        console.warn('[plate] login stage unavailable', err)
      })

    return () => {
      dead = true
      handle?.destroy()
      plateRef.current = null
    }
  }, [])

  /* Focusing a field steps the drawing back — the fields are the
     subject while someone is aiming at them. */
  const focusProps = {
    onFocus: () => plateRef.current?.setPresence(0.25),
    onBlur: () => plateRef.current?.setPresence(1),
  }

  /* ---- form ---- */
  function switchMode(next: Mode) {
    if (next === mode) return
    setMode(next)
    setError(null)
  }

  function fail(msg: string) {
    setError(msg)
    setShake((s) => s + 1)
    setStamp({ kind: 'no', seq: Date.now() })
  }

  async function handleGoogle() {
    setGoogleLoading(true)
    try {
      await signIn('google', { callbackUrl: '/app' })
    } catch {
      setGoogleLoading(false)
      fail('Could not start Google sign-in. Please try again.')
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (!email.trim()) return fail('Please enter your email or username.')
    if (email.includes('@') && !EMAIL_RE.test(email)) {
      return fail('That email address does not look right.')
    }
    if (mode === 'signup' && !name.trim()) return fail('Please enter your name.')
    if (!password) return fail('Please enter your password.')
    if (mode === 'signup' && password.length < 6) {
      return fail('Password must be at least 6 characters.')
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
        fail(data?.error ?? 'Something went wrong. Please try again.')
        return
      }

      setStamp({ kind: 'ok', seq: Date.now() })

      const params = new URLSearchParams(window.location.search)
      const from = params.get('from')
      const dest = from && from.startsWith('/') && !from.startsWith('//') ? from : '/app'

      // the stamp lands, then the wipe closes over it, then we route
      window.setTimeout(() => setWipe(true), 620)
      window.setTimeout(() => {
        router.push(dest)
        router.refresh()
      }, 1180)
    } catch {
      fail('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="plate-login">
      {/* ---- chrome ---- */}
      <div className="chrome">
        <Link href="/" className="wordmark">← DiagramMind</Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <span className="lbl beatread">PLATE · {plate}</span>
          <ThemeBtn />
        </div>
        <div className="chromeprog" />
      </div>

      {/* ---- left: the live plate ---- */}
      <section className="stagepane">
        <div>
          <div className="brandrow">
            <span className="mark" aria-hidden>
              ◆
            </span>
            <span className="lbl" style={{ color: 'var(--ink)' }}>
              <b className="wordmark">DiagramMind</b> · multi-agent pipeline
            </span>
          </div>
          <h2 className="pitch">
            FROM DIAGRAM
            <br />
            TO <em>VERIFIED</em>
            <br />
            QUESTION SET.
          </h2>
          <p className="pitchsub">
            A lens, a truss, a heart. The model has no idea what any of them are — it reads{' '}
            <span className="marker-highlight">structure</span>, which is why the same six agents work on
            optics, a bridge and an anatomy plate without one subject-specific rule between
            them.
          </p>
        </div>

        <div ref={stageRef} className="plate-stage" aria-hidden />

        <div className="statusrow">
          <span className="lbl" style={{ color: 'var(--ink)' }}>
            <span className="live" aria-hidden />
            Live · {plate}
          </span>
          <span className="lbl">6 agents standby</span>
          <div className="spectrum" aria-hidden>
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
        </div>
      </section>

      {/* ---- right: the card ---- */}
      <section className="formpane">
        <div className="cardslot">
          <div className={`card3d${flipped ? ' flipped' : ''}`}>
            {/* ── FRONT · SIGN IN ── */}
            <div className="face" inert={flipped}>
              <Spectrum />
              <div className="facehead">
                <span className="wordmark" style={{ color: 'var(--ink)' }}>
                  DiagramMind
                </span>
                <span className="lbl">ID · 2026</span>
              </div>
              <div className="facebody">
                <h1>SIGN IN</h1>
                <p className="sub">Access your question sets.</p>
                <form
                  onSubmit={handleSubmit}
                  noValidate
                  className={shake ? 'shake' : undefined}
                  key={`in-${shake}`}
                >
                  {!flipped && error && (
                    <p className="err" role="alert">
                      {error}
                    </p>
                  )}
                  <label className="f">
                    <span className="lbl">Email or username</span>
                    <input
                      className="field"
                      type="text"
                      autoComplete="username"
                      placeholder="you@school.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      {...focusProps}
                    />
                  </label>
                  <label className="f">
                    <span className="lbl">
                      Password
                      <Link
                        href="/forgot-password"
                        style={{ color: 'var(--ink-3)', textDecoration: 'none' }}
                      >
                        forgot?
                      </Link>
                    </span>
                    <input
                      className="field"
                      type="password"
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      {...focusProps}
                    />
                  </label>
                  <button className="btn" type="submit" disabled={loading}>
                    {loading ? 'Working…' : 'Sign in →'}
                  </button>
                  <button
                    className="btn sec"
                    type="button"
                    onClick={handleGoogle}
                    disabled={googleLoading}
                  >
                    {googleLoading ? 'Redirecting…' : 'Continue with Google'}
                  </button>
                  <button className="fliplink" type="button" onClick={() => switchMode('signup')}>
                    New here? Create account ↻
                  </button>
                </form>
              </div>
            </div>

            {/* ── BACK · CREATE ── */}
            <div className="face back" inert={!flipped}>
              <Spectrum />
              <div className="facehead">
                <span className="wordmark" style={{ color: 'var(--ink)' }}>
                  DiagramMind
                </span>
                <span className="lbl">NEW · 2026</span>
              </div>
              <div className="facebody">
                <h1>CREATE</h1>
                <p className="sub">Free. No card needed.</p>
                <form
                  onSubmit={handleSubmit}
                  noValidate
                  className={shake ? 'shake' : undefined}
                  key={`up-${shake}`}
                >
                  {flipped && error && (
                    <p className="err" role="alert">
                      {error}
                    </p>
                  )}
                  <label className="f">
                    <span className="lbl">Name</span>
                    <input
                      className="field"
                      type="text"
                      autoComplete="name"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      {...focusProps}
                    />
                  </label>
                  <label className="f">
                    <span className="lbl">Email</span>
                    <input
                      className="field"
                      type="email"
                      autoComplete="email"
                      placeholder="you@school.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      {...focusProps}
                    />
                  </label>
                  <label className="f">
                    <span className="lbl">Password</span>
                    <input
                      className="field"
                      type="password"
                      autoComplete="new-password"
                      placeholder="min. 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      {...focusProps}
                    />
                  </label>
                  <button className="btn" type="submit" disabled={loading}>
                    {loading ? 'Working…' : 'Create account →'}
                  </button>
                  <button className="fliplink" type="button" onClick={() => switchMode('signin')}>
                    Already have one? Sign in ↻
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* The right column was one card floating in a field of
            paper. Three cells of standing fact under it give the
            column a base, and they are the three things somebody
            hesitating on a sign-in form actually wants to know. */}
        <dl className="cardmeta" aria-label="What a run does">
          {[
            ['6', 'agents per run'],
            ['6', 'Bloom levels'],
            ['100%', 'answers verified'],
          ].map(([v, k]) => (
            <div key={k}>
              <dt>{v}</dt>
              <dd>{k}</dd>
            </div>
          ))}
        </dl>

        <p className="terms">
          By continuing you agree to the Terms and acknowledge the Privacy Policy.
        </p>
      </section>

      {/* ---- THE STAMP ---- */}
      {stamp && (
        <div
          key={stamp.seq}
          className="platestamp hit"
          aria-hidden
          style={
            stamp.kind === 'ok'
              ? { color: 'var(--b2)', borderColor: 'var(--b2)' }
              : { color: 'var(--red)', borderColor: 'var(--red)' }
          }
        >
          {stamp.kind === 'ok' ? 'APPROVED' : 'REJECTED'}
        </div>
      )}

      {/* ---- success wipe ---- */}
      <div className={`authwipe${wipe ? ' on' : ''}`} aria-hidden>
        <div>
          <span className="lbl">Authenticated</span>
          <h2 style={{ fontSize: 'clamp(28px,6vw,64px)', marginTop: 10 }}>ENTERING CONSOLE</h2>
        </div>
      </div>
    </div>
  )
}

function Spectrum() {
  return (
    <div className="spectrum" aria-hidden>
      <i />
      <i />
      <i />
      <i />
      <i />
      <i />
    </div>
  )
}

function ThemeBtn() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  const dark = mounted && resolvedTheme === 'dark'

  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      title="Toggle theme"
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {mounted ? (dark ? '☀ Theme' : '☾ Theme') : '☾ Theme'}
    </button>
  )
}
