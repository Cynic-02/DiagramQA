'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { KeyRound, ArrowLeft, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // read token from URL on mount
  useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const t = params.get('token')
      if (t) setToken(t)
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    if (!token) {
      setError('Invalid reset link')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Reset failed')
      router.push('/login?reset=success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="fixed right-4 top-4 z-[100]">
        <ThemeToggle />
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md rounded-[var(--radius)] border-[3px] border-border bg-card p-8 shadow-[6px_6px_0_0_black]"
        >
          <Link
            href="/login"
            className="mb-6 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3" /> Back to sign in
          </Link>

          <div className="mb-6 space-y-2">
            <div className="flex size-12 items-center justify-center rounded-[var(--radius)] border-[3px] border-border bg-primary text-primary-foreground shadow-[3px_3px_0_0_black]">
              <KeyRound className="size-5" />
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tight">
              Set a new <span className="text-secondary">password</span>
            </h1>
            <p className="text-sm font-medium text-muted-foreground">
              Enter your new password below.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-[var(--radius)] border-[3px] border-border bg-destructive px-4 py-3 text-sm font-bold text-white shadow-[3px_3px_0_0_black]">
                <AlertCircle className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">New password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Confirm password</label>
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter your password"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                'Reset password'
              )}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  )
}
