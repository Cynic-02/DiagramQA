'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Mail, ArrowLeft, ArrowRight, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) throw new Error('Request failed')
      setSent(true)
    } catch {
      setError('Something went wrong. Please try again.')
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

          {sent ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-[var(--radius)] border-[3px] border-border bg-accent text-accent-foreground shadow-[3px_3px_0_0_black]">
                <CheckCircle className="size-6" />
              </div>
              <h1 className="text-2xl font-black uppercase tracking-tight">
                Check your email
              </h1>
              <p className="text-sm font-medium text-muted-foreground">
                If an account exists for <span className="font-bold text-foreground">{email}</span>,
                a password reset link has been sent. The link expires in 1 hour.
              </p>
              <p className="text-xs text-muted-foreground">
                (In development, the reset link is logged to the server console.)
              </p>
              <Button asChild variant="outline" className="mt-4 w-full">
                <Link href="/login">Return to sign in</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-6 space-y-2">
                <div className="flex size-12 items-center justify-center rounded-[var(--radius)] border-[3px] border-border bg-primary text-primary-foreground shadow-[3px_3px_0_0_black]">
                  <Mail className="size-5" />
                </div>
                <h1 className="text-2xl font-black uppercase tracking-tight">
                  Reset your <span className="text-secondary">password</span>
                </h1>
                <p className="text-sm font-medium text-muted-foreground">
                  Enter your email and we&apos;ll send you a link to reset your password.
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
                  <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Email</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full"
                >
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      Send reset link
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>
              </form>
            </>
          )}
        </motion.div>
      </div>
    </div>
  )
}
