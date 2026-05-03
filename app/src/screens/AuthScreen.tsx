import React, { useState } from 'react'
import { LogoWordmark } from '../components/Logo'
import { Button } from '../components/Button'
import { Field } from '../components/Field'
import { User, Lock } from '../components/Icons'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { AuthUser, ScreenName } from '../types'

interface Props {
  onAuth: (user: AuthUser, token: string) => void
  go: (screen: ScreenName) => void
}

type Tab = 'login' | 'register'

function Spinner() {
  return <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: 8, animation: 'cs-spin 0.7s linear infinite' }} />
}

/** Map Supabase error strings to user-friendly copy. */
function friendlyError(msg: string): string {
  const m = msg.toLowerCase()
  if (m.includes('rate limit') || m.includes('email rate') || m.includes('too many'))
    return 'Too many attempts. Please wait a few minutes.'
  if (m.includes('already registered') || m.includes('user already exists'))
    return 'An account with this email already exists. Try signing in.'
  if (m.includes('invalid login') || m.includes('invalid credentials') || m.includes('invalid email or password'))
    return 'Incorrect email or password.'
  if (m.includes('email not confirmed'))
    return 'Please confirm your email first. Check your inbox.'
  if (m.includes('password'))
    return 'Password must be at least 6 characters.'
  return msg
}

export function AuthScreen({ onAuth, go }: Props) {
  const [tab,       setTab]       = useState<Tab>('login')
  const [name,      setName]      = useState('')
  const [email,     setEmail]     = useState('')
  const [password,  setPass]      = useState('')
  const [error,     setError]     = useState<string | null>(null)
  const [loading,   setLoading]   = useState(false)
  /** true after signUp returns without a session (email confirmation required) */
  const [emailSent, setEmailSent] = useState(false)

  const valid = tab === 'login'
    ? email.trim().length > 4 && password.trim().length >= 6
    : name.trim().length > 0 && email.trim().length > 4 && password.trim().length >= 6

  const submit = async () => {
    if (!valid || loading) return
    setError(null)
    setLoading(true)
    try {
      if (isSupabaseConfigured) {
        if (tab === 'login') {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim().toLowerCase(), password,
          })
          if (error || !data.user) throw new Error(friendlyError(error?.message ?? 'Invalid credentials.'))

          const authUser: AuthUser = {
            id:    data.user.id,
            email: data.user.email ?? '',
            name:  data.user.user_metadata?.name ?? email.split('@')[0],
          }
          // Supabase manages its own session storage — no manual localStorage writes
          onAuth(authUser, data.session?.access_token ?? '')

        } else {
          // ── Register ────────────────────────────────────────────────────
          const { data, error } = await supabase.auth.signUp({
            email:    email.trim().toLowerCase(),
            password,
            options: {
              data: { name: name.trim(), role: 'customer' },
              // Redirect here after the user clicks the confirmation link
              emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
          })
          if (error) throw new Error(friendlyError(error.message))
          if (!data.user) throw new Error('Registration failed. Please try again.')

          if (!data.session) {
            // Email confirmation is enabled in Supabase — user must verify first
            setEmailSent(true)
            return
          }

          // Email confirmation disabled — log straight in
          const authUser: AuthUser = {
            id:    data.user.id,
            email: data.user.email ?? '',
            name:  name.trim(),
          }
          // Supabase manages its own session storage — no manual localStorage writes
          onAuth(authUser, data.session.access_token)
        }
      } else {
        // ── Fallback: Express server (local dev without Supabase) ──────────
        const endpoint = tab === 'login' ? '/api/auth/login' : '/api/auth/register'
        const body     = tab === 'login'
          ? { email: email.trim(), password }
          : { email: email.trim(), name: name.trim(), password }

        const res  = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? 'Something went wrong')

        localStorage.setItem('cs_token', json.token)
        localStorage.setItem('cs_user',  JSON.stringify(json.user))
        onAuth(json.user as AuthUser, json.token)
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const continueAsGuest = () => {
    const guest: AuthUser = { id: 'guest', email: '', name: 'Guest' }
    onAuth(guest, '')
  }

  // ── Email-sent confirmation screen ───────────────────────────────────────────
  if (emailSent) {
    return (
      <div className="cs-screen cs-screen--paper" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ padding: '0 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
          <div style={{ fontSize: 52, marginBottom: 20 }}>📬</div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.6, color: 'var(--cs-ink)', textAlign: 'center' }}>
            Check your inbox
          </div>
          <div style={{ fontSize: 14, color: 'var(--cs-slate-500)', marginTop: 10, lineHeight: 1.6, textAlign: 'center', maxWidth: 280 }}>
            We sent a confirmation link to <strong style={{ color: 'var(--cs-ink)' }}>{email.trim().toLowerCase()}</strong>.
            Click it to activate your account and sign in.
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--cs-slate-400)', fontFamily: 'var(--cs-mono)', textAlign: 'center' }}>
            Didn't get it? Check spam or wait 60 seconds before retrying.
          </div>
          <button
            onClick={() => { setEmailSent(false); setError(null) }}
            style={{
              marginTop: 28, padding: '12px 28px',
              background: 'var(--cs-slate-100)', border: 'none', borderRadius: 12,
              fontFamily: 'var(--cs-font)', fontSize: 14, fontWeight: 500,
              color: 'var(--cs-ink)', cursor: 'pointer',
            }}
          >
            ← Back to sign in
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="cs-screen cs-screen--paper" style={{ justifyContent: 'center' }}>
      <div style={{ padding: '44px 28px 40px', display: 'flex', flexDirection: 'column', gap: 0 }}>
        {/* Brand — centred, with safe-area top padding */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <LogoWordmark scale={0.68} />
        </div>

        {/* Tagline */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.8, color: 'var(--cs-ink)' }}>
            {tab === 'login' ? 'Welcome back.' : 'Create your account.'}
          </div>
          <div style={{ fontSize: 14, color: 'var(--cs-slate-500)', marginTop: 6, lineHeight: 1.4 }}>
            {tab === 'login' ? 'Sign in to track and repeat your deliveries.' : 'Takes 10 seconds. No credit card required yet.'}
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', padding: 4, background: 'var(--cs-slate-100)', borderRadius: 12, gap: 2, marginBottom: 24 }}>
          {(['login', 'register'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(null) }}
              style={{
                flex: 1, border: 'none', cursor: 'pointer', height: 36,
                background: tab === t ? '#fff' : 'transparent',
                color: tab === t ? 'var(--cs-ink)' : 'var(--cs-slate-500)',
                fontFamily: 'var(--cs-font)', fontSize: 14, fontWeight: 500,
                borderRadius: 9, boxShadow: tab === t ? '0 1px 2px rgba(11,18,32,.08)' : 'none',
                transition: 'all .15s', textTransform: 'capitalize',
              }}
            >
              {t === 'login' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {tab === 'register' && (
            <Field
              label="Full name"
              value={name}
              onChange={setName}
              placeholder="Sasha Novak"
              icon={<User size={18} />}
            />
          )}
          <Field
            label="Email"
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
            type="email"
          />
          <Field
            label="Password"
            value={password}
            onChange={setPass}
            placeholder="6+ characters"
            type="password"
            icon={<Lock size={18} />}
          />
          {tab === 'login' && (
            <div style={{ textAlign: 'right', marginTop: -4 }}>
              <button
                onClick={() => go('forgot-password')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--cs-slate-500)', fontFamily: 'var(--cs-font)', padding: 0 }}
              >
                Forgot password?
              </button>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(179,38,30,.08)', borderRadius: 10, fontSize: 13, color: 'var(--cs-err)', lineHeight: 1.4 }}>
            {error}
          </div>
        )}

        {/* Submit */}
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Button
            kind="ink" size="lg" full
            onClick={submit}
            disabled={!valid || loading}
            icon={loading ? <Spinner /> : undefined}
          >
            {loading ? (tab === 'login' ? 'Signing in…' : 'Creating account…') : (tab === 'login' ? 'Sign in' : 'Create account')}
          </Button>

          <button
            onClick={continueAsGuest}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 14, color: 'var(--cs-slate-500)', fontFamily: 'var(--cs-font)',
              padding: '8px 0', textAlign: 'center',
            }}
          >
            Continue as guest →
          </button>
        </div>

        {/* Fine print */}
        <div style={{ marginTop: 24, textAlign: 'center', fontSize: 11, color: 'var(--cs-slate-400)', fontFamily: 'var(--cs-mono)', lineHeight: 1.6 }}>
          SAME-DAY · WINNIPEG · citysend.ca
        </div>
      </div>
    </div>
  )
}
