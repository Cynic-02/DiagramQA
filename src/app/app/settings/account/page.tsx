'use client'

import * as React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  User, Mail, KeyRound, ShieldCheck, ArrowLeft, Loader2, Save,
} from 'lucide-react'
import { toast } from 'sonner'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'

interface UserData {
  id: string
  email: string
  name: string | null
}

export default function AccountSettingsPage() {
  const [user, setUser] = React.useState<UserData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [submitting, setSubmitting] = React.useState(false)

  // Form states
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [currentPassword, setCurrentPassword] = React.useState('')
  const [newPassword, setNewPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')

  const loadProfile = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/me')
      if (!res.ok) throw new Error()
      const data = await res.json()
      if (data.user) {
        setUser(data.user)
        setName(data.user.name || '')
        setEmail(data.user.email || '')
      }
    } catch {
      toast.error('Failed to load user profile')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword && newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          ...(newPassword ? { currentPassword, newPassword } : {}),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile')
      }

      toast.success('Account profile updated successfully')
      setUser(data.user)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col grid-faint-lighter bg-background text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-50 w-full flex h-14 items-center justify-between border-b border-border/40 bg-background/85 backdrop-blur-md px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" asChild>
            <Link href="/app"><ArrowLeft className="size-3" />Console</Link>
          </Button>
          <span className="text-border">/</span>
          <span className="text-xs text-muted-foreground uppercase font-semibold">Account Settings</span>
        </div>
        <ThemeToggle />
      </nav>

      <div className="relative z-10 mx-auto w-full max-w-xl flex-1 p-6 md:p-8">
        {/* Header */}
        <div className="mb-8 space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center border border-primary/45 bg-primary/10 text-primary rounded-lg">
              <User className="size-5" />
            </div>
            <h1 className="text-2xl font-black tracking-tight md:text-[28px] uppercase">
              Account <span className="text-primary">Profile</span>
            </h1>
          </div>
          <p className="max-w-2xl text-xs text-muted-foreground">
            View and update your login credentials and profile metadata.
          </p>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : !user ? (
          <Card className="brutal-block p-6 text-center">
            <p className="text-sm text-muted-foreground">Please log in to edit your account settings.</p>
          </Card>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              <Card className="brutal-block p-6 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Display Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 size-4 text-muted-foreground/60" />
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-9 text-xs"
                      placeholder="e.g. Professor Smith"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground/60" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9 text-xs"
                      placeholder="e.g. smith@university.edu"
                      required
                    />
                  </div>
                </div>
              </Card>

              {/* Password Section */}
              <Card className="brutal-block p-6 space-y-4 bg-muted/10">
                <div className="flex items-center gap-2 border-b border-border/30 pb-2">
                  <KeyRound className="size-4 text-primary" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Change Password</h2>
                </div>

                <p className="text-[10px] text-muted-foreground">
                  Leave blank if you do not wish to change your password.
                </p>

                <div className="space-y-1.5">
                  <Label htmlFor="current-pw" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Current Password
                  </Label>
                  <Input
                    id="current-pw"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="text-xs"
                    required={!!newPassword}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="new-pw" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    New Password
                  </Label>
                  <Input
                    id="new-pw"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm-pw" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Confirm New Password
                  </Label>
                  <Input
                    id="confirm-pw"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </Card>

              <div className="flex justify-end gap-3">
                <Button variant="outline" size="sm" type="button" asChild>
                  <Link href="/app">Cancel</Link>
                </Button>
                <Button size="sm" type="submit" disabled={submitting} className="gap-1.5 font-bold">
                  {submitting ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Save className="size-3.5" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </div>
    </div>
  )
}
